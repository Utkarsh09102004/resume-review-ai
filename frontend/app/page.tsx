export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="rounded-2xl border border-bg-border bg-bg-surface px-12 py-16 text-center shadow-lg">
        <h1 className="text-4xl font-bold tracking-tight text-accent-amber">
          ResumeForge
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          AI-powered LaTeX resume editor
        </p>
      </div>
    </div>
  );
}
