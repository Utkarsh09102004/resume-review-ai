export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-bg-border border-t-accent-amber" />
        <p className="text-sm text-text-secondary">Loading workspace...</p>
      </div>
    </div>
  );
}
