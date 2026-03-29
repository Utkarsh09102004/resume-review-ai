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
    <article className="dashboard-panel dashboard-panel--interactive rounded-[24px] p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="dashboard-chip px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary/85">
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
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] tabular-nums text-text-secondary/75">
                  Updated {formatDate(resume.updatedAt)}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(resume.id)}
              className="dashboard-button dashboard-button--primary h-10 cursor-pointer px-3.5 text-sm font-semibold"
              aria-label={`Open ${resume.title}`}
            >
              <ArrowUpRight size={14} />
              Open
            </button>
            <button
              type="button"
              onClick={() => onRequestRename(resume.id)}
              className="dashboard-button dashboard-button--secondary h-10 cursor-pointer px-3.5 text-sm font-medium text-text-primary"
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
          <div className="text-[11px] uppercase tracking-[0.14em] tabular-nums text-text-secondary/75">
            Updated {formatDate(resume.updatedAt)}
          </div>
        ) : null}
      </div>
    </article>
  );
}
