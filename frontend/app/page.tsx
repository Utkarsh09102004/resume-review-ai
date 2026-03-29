import { redirect } from 'next/navigation';
import { getAuthContext, isAuthEnabled } from '@/lib/auth';

// This route branches on request-scoped auth state and must never be prerendered.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // In dev mode (auth disabled), go straight to dashboard
  if (!isAuthEnabled()) {
    redirect('/dashboard');
  }

  // In production, check auth state
  const context = await getAuthContext();

  if (context.isAuthenticated) {
    redirect('/dashboard');
  }

  // Not authenticated — show sign-in landing
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="rounded-2xl border border-bg-border bg-bg-surface px-12 py-16 text-center shadow-lg">
        <h1 className="text-4xl font-bold tracking-tight text-accent-amber">
          ResumeForge
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          AI-powered LaTeX resume editor
        </p>
        <a
          href="/api/logto/sign-in"
          className="mt-8 inline-block rounded-lg bg-accent-amber px-6 py-3 font-semibold text-bg-deep transition-opacity hover:opacity-90"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
