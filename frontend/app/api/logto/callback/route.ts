import { handleSignIn } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Pass the full URL (not just searchParams) so the SDK reconstructs
  // the correct callback path (/api/logto/callback) when validating
  // the OIDC redirect URI. Passing only searchParams causes the SDK
  // to default to `${baseUrl}/callback` which mismatches the actual route.
  const url = new URL(request.url);
  return await handleSignIn(logtoConfig, url);
}
