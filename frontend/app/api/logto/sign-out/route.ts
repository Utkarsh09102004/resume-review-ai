import { signOut } from '@logto/next/server-actions';
import { getLogtoConfig } from '@/lib/logto';

export async function GET() {
  const logtoConfig = getLogtoConfig();

  return await signOut(logtoConfig, logtoConfig.baseUrl);
}
