import { signIn } from '@logto/next/server-actions';
import { getLogtoConfig } from '@/lib/logto';

export async function GET() {
  const logtoConfig = getLogtoConfig();

  return await signIn(logtoConfig, {
    redirectUri: `${logtoConfig.baseUrl}/api/logto/callback`,
  });
}
