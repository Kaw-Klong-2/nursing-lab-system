import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { prisma } from '@/lib/prisma';

/**
 * Helper to extract Google Drive file ID from multiple URL formats
 */
function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern 1: drive.google.com/file/d/FILE_ID/...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) return fileDMatch[1];

  // Pattern 2: id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  // Pattern 3: drive.google.com/open?id=FILE_ID
  const openMatch = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  return null;
}

/**
 * GET /api/manuals/upload
 * Fetch persisted custom E-Books from PostgreSQL (ActivityLog metadata)
 */
export async function GET() {
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        entityType: 'SANDBOX_EBOOK',
        action: 'EBOOK_SAVE',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const seenIds = new Set<string>();
    const ebooks: unknown[] = [];

    for (const log of logs) {
      const meta = log.metadata as Record<string, unknown> | null;
      if (!meta) continue;
      const ebookId = (typeof meta.id === 'string' && meta.id) || log.entityId || '';
      if (ebookId && seenIds.has(ebookId)) continue;
      if (ebookId) seenIds.add(ebookId);
      ebooks.push(meta);
    }

    return NextResponse.json({ success: true, ebooks });
  } catch (error: any) {
    console.error('Error fetching persisted ebooks:', error);
    return NextResponse.json(
      { success: false, ebooks: [], error: error?.message || 'ไม่สามารถโหลดข้อมูลคู่มือได้' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manuals/upload
 * Supports:
 * 1) JSON persistence actions: SAVE_EBOOK / DELETE_EBOOK
 * 2) Multipart PDF file upload (Vercel serverless-safe without touching read-only /var/task/public)
 * 3) Google Drive link extraction
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle JSON persistence actions
    if (contentType.includes('application/json')) {
      const body = await req.json();

      if (body?.action === 'SAVE_EBOOK' && body?.ebook?.id) {
        const ebook = body.ebook;
        const ebookId = String(ebook.id);

        // Remove previous record with same ID to avoid duplicates
        await prisma.activityLog.deleteMany({
          where: {
            entityType: 'SANDBOX_EBOOK',
            action: 'EBOOK_SAVE',
            entityId: ebookId,
          },
        });

        await prisma.activityLog.create({
          data: {
            action: 'EBOOK_SAVE',
            entityType: 'SANDBOX_EBOOK',
            entityId: ebookId,
            entityTitle: String(ebook.title || 'คู่มือห้องปฏิบัติการ').slice(0, 200),
            details: `บันทึก E-Book คู่มือ: ${String(ebook.title || '')}`,
            metadata: ebook,
          },
        });

        return NextResponse.json({ success: true, id: ebookId });
      }

      if (body?.action === 'DELETE_EBOOK' && body?.id) {
        const ebookId = String(body.id);
        await prisma.activityLog.deleteMany({
          where: {
            entityType: 'SANDBOX_EBOOK',
            entityId: ebookId,
          },
        });

        return NextResponse.json({ success: true, id: ebookId });
      }

      return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
    }

    // Handle multipart/form-data (PDF Upload or Google Drive Link)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const directDriveUrl = formData.get('driveUrl') as string | null;

    // Case 1: Direct Google Drive Link provided
    if (directDriveUrl && directDriveUrl.trim()) {
      const driveId = extractGoogleDriveId(directDriveUrl);
      return NextResponse.json({
        success: true,
        source: 'GOOGLE_DRIVE_LINK',
        url: directDriveUrl.trim(),
        driveId: driveId || undefined,
        previewUrl: driveId
          ? `https://drive.google.com/file/d/${driveId}/preview`
          : directDriveUrl.trim(),
      });
    }

    // Case 2: File Upload via drag & drop / file picker
    if (!file) {
      return NextResponse.json(
        { error: 'กรุณาแนบไฟล์ PDF หรือระบุลิงก์ Google Drive' },
        { status: 400 }
      );
    }

    // Validate mime type or extension
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์เอกสารประเภท .pdf เท่านั้น' },
        { status: 400 }
      );
    }

    // Maximum size: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน 50MB)' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename and create unique timestamp
    const ext = path.extname(file.name) || '.pdf';
    const cleanBase = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
    const fileName = `${Date.now()}_${cleanBase}${ext}`;

    let relativeUrl = '';
    let source = 'SERVERLESS_PROCESSED';

    // Only attempt writing into local public/uploads/manuals when NOT running on Vercel serverless
    if (!process.env.VERCEL) {
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'manuals');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        relativeUrl = `/uploads/manuals/${fileName}`;
        source = 'SERVER_STORAGE';
      } catch (localWriteErr) {
        console.warn('Local public write skipped, falling back to serverless tmp:', localWriteErr);
      }
    }

    // On Vercel serverless (or if local public write was skipped), optionally buffer to os.tmpdir() safely
    if (!relativeUrl) {
      try {
        const tmpDir = path.join(os.tmpdir(), 'manuals');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const tmpPath = path.join(tmpDir, fileName);
        fs.writeFileSync(tmpPath, buffer);
      } catch (tmpErr) {
        console.warn('Serverless tmp write skipped gracefully:', tmpErr);
      }
    }

    // Optional: Check if Google Drive Service Account credentials exist for auto-sync
    const googleCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const googleFolderId = process.env.GOOGLE_DRIVE_MANUALS_FOLDER_ID;
    let syncedDriveUrl: string | null = null;
    if (googleCredentials && googleFolderId) {
      // Reserved for Google Drive Service Account auto-sync
    }

    return NextResponse.json({
      success: true,
      source: syncedDriveUrl ? 'AUTO_GOOGLE_DRIVE_SYNC' : source,
      url: syncedDriveUrl || relativeUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Error in manual upload:', error);
    return NextResponse.json(
      { error: error?.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์คู่มือ' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/manuals/upload?id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ไม่พบรหัสคู่มือ' }, { status: 400 });
    }

    await prisma.activityLog.deleteMany({
      where: {
        entityType: 'SANDBOX_EBOOK',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting persisted ebook:', error);
    return NextResponse.json(
      { error: error?.message || 'เกิดข้อผิดพลาดในการลบคู่มือ' },
      { status: 500 }
    );
  }
}
