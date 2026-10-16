import { handleGoogleAuthRequest } from '@/lib/google-auth';

export async function POST(req: Request) {
  return handleGoogleAuthRequest(req);
}
