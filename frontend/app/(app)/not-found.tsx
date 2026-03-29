import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-bg-border bg-bg-surface p-6 text-center shadow-lg">
        <h2 className="text-lg font-semibold text-text-primary">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          That route does not exist in the authenticated app area.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-md bg-accent-amber px-4 py-2 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
