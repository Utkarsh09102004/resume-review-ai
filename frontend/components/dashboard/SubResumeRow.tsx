import { ArrowUpRight, FileText, PencilLine } from "lucide-react";
import type { SubResumeSummary } from "@/lib/resumes";
import { SubResumeMenu } from "./ResumeMenu";
import InlineRename from "./InlineRename";

interface SubResumeRowProps {
  resume: SubResumeSummary;
  onOpen: (id: string) => void;
  onRequestRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRequestDelete: (id: string) => void;
  isRenaming?: boolean;
  onRename?: (id: string, newTitle: string) => void;
  onCancelRename?: () => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(dateStr: string): string {
  return DATE_FORMATTER.format(new Date(dateStr));
}

export default function SubResumeRow({
  resume,
  onOpen,
  onRequestRename,
  onDuplicate,
  onRequestDelete,
  isRenaming,
  onRename,
  onCancelRename,
}: SubResumeRowProps) {
  return (
    <article className="rounded-[24px] border border-bg-border/75 bg-[linear-gradient(180deg,rgba(35,35,46,0.86),rgba(27,27,36,0.82))] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)] transition-colors hover:border-accent-amber/20">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-bg-border/80 bg-bg-elevated/45 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-secondary/85">
              <FileText size={12} className="text-accent-amber" />
              Tailored Version
            </div>

            {isRenaming && onRename && onCancelRename ? (
              <div className="mt-3">
                <InlineRename
                  value={resume.title}
                  onSave={(newTitle) => onRename(resume.id, newTitle)}
                  onCancel={onCancelRename}
                  className="text-base font-semibold"
                />
              </div>
            ) : (
              <>
                <h4
                  className="mt-3 truncate text-base font-semibold text-text-primary cursor-text"
                  onDoubleClick={() => onRequestRename(resume.id)}
                  title="Double-click to rename"
                >
                  {resume.title}
                </h4>
                <p className="mt-1 text-xs tabular-nums text-text-secondary">
                  Updated {formatDate(resume.updatedAt)}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(resume.id)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-amber px-3.5 text-sm font-semibold text-bg-deep transition hover:brightness-110 cursor-pointer"
              aria-label={`Open ${resume.title}`}
            >
              <ArrowUpRight size={14} />
              Open
            </button>
            <button
              type="button"
              onClick={() => onRequestRename(resume.id)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-bg-border/80 bg-bg-elevated/45 px-3.5 text-sm font-medium text-text-primary transition-colors hover:border-accent-amber/30 hover:text-accent-amber cursor-pointer"
              aria-label={`Rename ${resume.title}`}
            >
              <PencilLine size={14} />
              Rename
            </button>
            <SubResumeMenu
              onDuplicate={() => onDuplicate(resume.id)}
              onDelete={() => onRequestDelete(resume.id)}
            />
          </div>
        </div>

        {isRenaming && onRename && onCancelRename ? (
          <div className="text-xs tabular-nums text-text-secondary">
            Updated {formatDate(resume.updatedAt)}
          </div>
        ) : null}
      </div>
    </article>
  );
}
