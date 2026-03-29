import { signIn } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';

export async function GET() {
  return await signIn(logtoConfig, {
    redirectUri: `${logtoConfig.baseUrl}/api/logto/callback`,
  });
}
