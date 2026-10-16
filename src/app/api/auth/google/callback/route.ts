import { NextResponse } from 'next/server';
import { handleGoogleAuthRequest } from '@/lib/google-auth';

// Handles GIS redirect mode POST to /api/auth/google/callback
export async function POST(req: Request) {
  return handleGoogleAuthRequest(req);
}

// Fallback for direct browser GET navigation to callback
export async function GET(req: Request) {
  return NextResponse.redirect(new URL('/login', req.url), 303);
}
