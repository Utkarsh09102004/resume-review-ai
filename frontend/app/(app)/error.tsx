"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-bg-border bg-bg-surface p-6 text-center shadow-lg">
        <h2 className="text-lg font-semibold text-text-primary">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          The app shell failed to load. Try the request again.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-accent-amber px-4 py-2 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90 cursor-pointer"
          >
            Retry
          </button>
          <a
            href="/dashboard"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
