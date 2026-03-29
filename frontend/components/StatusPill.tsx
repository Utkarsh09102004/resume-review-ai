"use client";

type StatusPillProps =
  | {
      variant: "compiling";
    }
  | {
      variant: "compiled";
      compiledAgo?: string;
    }
  | {
      variant: "error";
      errorCount?: number;
      onClick?: () => void;
    };

export default function StatusPill({
  ...props
}: StatusPillProps) {
  if (props.variant === "compiling") {
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

  if (props.variant === "compiled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-status-success/30 bg-status-success/10 px-3 py-1 text-xs font-medium text-status-success">
        <span className="h-2 w-2 rounded-full bg-status-success" />
        Compiled{props.compiledAgo ? ` ${props.compiledAgo}` : ""}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-status-error/30 bg-status-error/10 px-3 py-1 text-xs font-medium text-status-error transition-colors hover:bg-status-error/20 cursor-pointer"
    >
      <span className="h-2 w-2 rounded-full bg-status-error" />
      {props.errorCount !== undefined
        ? `${props.errorCount} error${props.errorCount !== 1 ? "s" : ""}`
        : "Error"}
    </button>
  );
}
