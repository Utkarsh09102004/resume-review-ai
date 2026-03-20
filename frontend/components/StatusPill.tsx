"use client";

interface StatusPillProps {
  status: "compiling" | "compiled" | "error";
  compiledAgo?: string;
  errorCount?: number;
  onErrorClick?: () => void;
}

export default function StatusPill({
  status,
  compiledAgo,
  errorCount,
  onErrorClick,
}: StatusPillProps) {
  if (status === "compiling") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-3 py-1 text-xs font-medium text-accent-amber">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-amber opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-amber" />
        </span>
        Compiling...
      </span>
    );
  }

  if (status === "compiled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-status-success/30 bg-status-success/10 px-3 py-1 text-xs font-medium text-status-success">
        <span className="h-2 w-2 rounded-full bg-status-success" />
        Compiled{compiledAgo ? ` ${compiledAgo}` : ""}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onErrorClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-status-error/30 bg-status-error/10 px-3 py-1 text-xs font-medium text-status-error transition-colors hover:bg-status-error/20 cursor-pointer"
    >
      <span className="h-2 w-2 rounded-full bg-status-error" />
      {errorCount !== undefined ? `${errorCount} error${errorCount !== 1 ? "s" : ""}` : "Error"}
    </button>
  );
}
