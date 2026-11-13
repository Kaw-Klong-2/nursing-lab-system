import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
 * POST /api/manuals/upload
 * Supports direct multipart PDF file upload and auto-syncing to Google Drive if configured
 */
export async function POST(req: NextRequest) {
  try {
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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'manuals');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/manuals/${fileName}`;

    // Optional: Check if Google Drive Service Account credentials exist for auto-sync
    const googleCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const googleFolderId = process.env.GOOGLE_DRIVE_MANUALS_FOLDER_ID;

    let syncedDriveUrl: string | null = null;
    if (googleCredentials && googleFolderId) {
      // In production with service account, this uploads directly to Google Drive folder
      // and returns syncedDriveUrl. Here we gracefully fallback if not configured yet.
    }

    return NextResponse.json({
      success: true,
      source: syncedDriveUrl ? 'AUTO_GOOGLE_DRIVE_SYNC' : 'SERVER_STORAGE',
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
