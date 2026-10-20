import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Use configured client ID or fallback
const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  '852809851978-sdl1j15pb8db2uh6lm9kcmopghn4hhv2.apps.googleusercontent.com';
const client = new OAuth2Client(googleClientId);

export async function handleGoogleAuthRequest(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  const isFormPost =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  try {
    let credential = '';

    if (isFormPost) {
      const formData = await req.formData();
      credential = String(formData.get('credential') || '');
    } else {
      const body = await req.json().catch(() => ({}));
      credential = body.credential || '';
    }

    if (!credential) {
      const errMsg = 'ไม่พบข้อมูลการยืนยันตัวตนจาก Google (Missing credential)';
      if (isFormPost) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errMsg)}`, req.url), 303);
      }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    let payload: any = null;

    // Verify token using google-auth-library
    if (googleClientId) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleClientId,
        });
        payload = ticket.getPayload();
      } catch (verifyErr: any) {
        console.error('Google token verification failed with client ID:', verifyErr);
        const errMsg = 'การยืนยันตัวตนกับ Google ล้มเหลว กรุณาลองใหม่อีกครั้ง';
        if (isFormPost) {
          return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errMsg)}`, req.url), 303);
        }
        return NextResponse.json({ error: errMsg }, { status: 401 });
      }
    } else {
      // Fallback verification using Google's public tokeninfo endpoint
      try {
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!tokenInfoRes.ok) {
          throw new Error('Invalid token from tokeninfo');
        }
        payload = await tokenInfoRes.json();
      } catch (err: any) {
        console.error('Tokeninfo fetch error:', err);
        const errMsg = 'ไม่สามารถตรวจสอบความถูกต้องของโทเคน Google ได้';
        if (isFormPost) {
          return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errMsg)}`, req.url), 303);
        }
        return NextResponse.json({ error: errMsg }, { status: 401 });
      }
    }

    if (!payload || !payload.email) {
      const errMsg = 'ไม่พบข้อมูลอีเมลจากบัญชี Google';
      if (isFormPost) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errMsg)}`, req.url), 303);
      }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const email = String(payload.email).trim().toLowerCase();

    // Find user in database by email (case-insensitive)
    let user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
    });

    // If user does not exist in database (Strict: only pre-registered accounts allowed)
    if (!user) {
      const errMsg = `ไม่พบบัญชี "${email}" ในระบบห้องปฏิบัติการพยาบาล กรุณาติดต่อเจ้าหน้าที่ห้องปฏิบัติการเพื่อลงทะเบียนก่อนเข้าใช้งาน`;
      if (isFormPost) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errMsg)}`, req.url), 303);
      }
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }

    // Check account status
    if (user.status && user.status !== 'ACTIVE') {
      const errMsg = 'บัญชีผู้ใช้นี้ถูกปิดการใช้งานหรือระงับสิทธิ์แล้ว กรุณาติดต่อเจ้าหน้าที่ห้องปฏิบัติการ';
      if (isFormPost) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errMsg)}`, req.url), 303);
      }
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }

    // Return sanitized user (exclude password, resetToken)
    const sanitizedUser = {
      id: user.id,
      prefix: user.prefix,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      approvalScopes: user.role === 'USER' ? null : (user.approvalScopes || null),
      isExecutive: Boolean(user.isExecutive),
      executiveRole: user.executiveRole || null,
    };

    // Record login presence and activity log
    const userAgent = req.headers.get('user-agent');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');

    const { recordUserHeartbeat, detectDeviceType } = await import('@/lib/user-presence');
    const { logActivity } = await import('@/lib/activity-log');

    const device = detectDeviceType(userAgent);

    recordUserHeartbeat({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userAgent,
      ipAddress,
      isLogin: true,
    });

    logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      entityTitle: user.name,
      details: `เข้าสู่ระบบผ่าน Google Account (${device === 'MOBILE' ? 'สมาร์ทโฟน/แท็บเล็ต' : 'คอมพิวเตอร์'})`,
      ipAddress,
      metadata: { device, userAgent, provider: 'GOOGLE' },
    }).catch(() => {});

    // If request was sent via Google GIS Redirect Mode (HTTP Form POST)
    if (isFormPost) {
      const secret = process.env.EXTERNAL_SYNC_API_KEY || 'lab_nursing_sync_key_2026_sec';
      const ts = Date.now();
      const source = 'google_gis_redirect';
      const sig = crypto
        .createHmac('sha256', secret)
        .update(`${user.email.toLowerCase()}:${ts}:${source}`)
        .digest('hex');
      const tokenPayload = {
        email: user.email.toLowerCase(),
        ts,
        source,
        sig,
      };
      const portalToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
      const encodedToken = encodeURIComponent(portalToken);
      const targetUrl = `/?portal_token=${encodedToken}`;
      const serializedUser = JSON.stringify(sanitizedUser).replace(/</g, '\\u003c');

      const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>กำลังเข้าสู่ระบบ KUNurse+Lab...</title>
</head>
<body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <p style="font-size:14px;color:#2dd4bf;font-weight:bold;">กำลังเข้าสู่ระบบ KUNurse+Lab...</p>
  </div>
  <script>
    (function() {
      try {
        var user = ${serializedUser};
        var now = Date.now();
        var lifetime = 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('active_user_id', user.id);
        localStorage.setItem('cached_current_user', JSON.stringify(user));
        localStorage.setItem('session_expires_at', String(now + lifetime));
        localStorage.setItem('session_last_active', String(now));
        localStorage.setItem('session_remember_me', 'true');
        window.location.replace('/');
      } catch (e) {
        window.location.replace(${JSON.stringify(targetUrl)});
      }
    })();
  </script>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error('Google login route error:', error);
    const errMsg = error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
    if (isFormPost) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errMsg)}`, req.url), 303);
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
