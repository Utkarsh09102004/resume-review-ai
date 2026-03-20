"use client";

import { ChevronDown, AlertTriangle } from "lucide-react";

interface ErrorItem {
  line: number;
  message: string;
}

interface ErrorPanelProps {
  errors: ErrorItem[];
  expanded: boolean;
  onToggle: () => void;
  onLineClick: (line: number) => void;
}

export default function ErrorPanel({
  errors,
  expanded,
  onToggle,
  onLineClick,
}: ErrorPanelProps) {
  if (errors.length === 0) return null;

  return (
    <div className="border-t border-bg-border bg-bg-surface">
      {/* Toggle header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-bg-elevated cursor-pointer"
        aria-expanded={expanded}
      >
        <ChevronDown
          size={14}
          className={`text-status-error transition-transform duration-200 ${
            expanded ? "rotate-0" : "-rotate-90"
          }`}
        />
        <AlertTriangle size={14} className="text-status-error" />
        <span className="text-xs font-medium text-status-error">
          {errors.length} error{errors.length !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Error list */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: expanded ? "150px" : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="max-h-[150px] overflow-y-auto border-t border-bg-border">
          {errors.map((error, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onLineClick(error.line)}
              className="flex w-full items-start gap-3 border-l-2 border-status-error px-4 py-2 text-left transition-colors hover:bg-bg-elevated cursor-pointer"
            >
              <span className="shrink-0 rounded bg-status-error/15 px-1.5 py-0.5 font-editor text-[11px] font-medium text-status-error">
                L{error.line}
              </span>
              <span className="text-xs text-text-secondary leading-relaxed">
                {error.message}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
