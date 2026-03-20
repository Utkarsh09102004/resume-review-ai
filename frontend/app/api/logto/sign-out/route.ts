import { signOut } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';

export async function GET() {
  await signOut(logtoConfig, logtoConfig.baseUrl);
}
