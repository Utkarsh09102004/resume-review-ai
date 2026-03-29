import { ArrowUpRight, Copy, FileStack, PencilLine, Plus, Sparkles } from "lucide-react";
import type { DashboardSearchMatchSource } from "@/lib/dashboardControls";
import type { ResumeGroup } from "@/lib/resumes";
import { MainResumeMenu } from "./ResumeMenu";
import SubResumeRow from "./SubResumeRow";
import InlineRename from "./InlineRename";

interface ResumeGroupCardProps {
  resume: ResumeGroup;
  onOpen: (id: string) => void;
  onRequestRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCreateSubResume: (parentId: string) => void;
  onRequestDelete: (id: string) => void;
  renamingId?: string | null;
  onRename?: (id: string, newTitle: string) => void;
  onCancelRename?: () => void;
  animationDelayMs?: number;
  visibleSubResumes?: ResumeGroup["subResumes"];
  matchedSubResumeIds?: string[];
  searchMatchSource?: DashboardSearchMatchSource;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(dateStr: string): string {
  return DATE_FORMATTER.format(new Date(dateStr));
}

function formatTailoredCount(count: number) {
  return `${count} tailored ${count === 1 ? "version" : "versions"}`;
}

export default function ResumeGroupCard({
  resume,
  onOpen,
  onRequestRename,
  onDuplicate,
  onCreateSubResume,
  onRequestDelete,
  renamingId,
  onRename,
  onCancelRename,
  animationDelayMs = 0,
  visibleSubResumes,
  matchedSubResumeIds = [],
  searchMatchSource = null,
}: ResumeGroupCardProps) {
  const isRenaming = renamingId === resume.id;
  const subResumes = visibleSubResumes ?? resume.subResumes;
  const hasVisibleTailoredVersions = subResumes.length > 0;
  const searchMatchLabel =
    searchMatchSource === "both"
      ? "Base + tailored match"
      : searchMatchSource === "base"
        ? "Title match"
        : searchMatchSource === "tailored"
          ? "Tailored match"
          : null;

  return (
    <article
      className="dashboard-panel dashboard-panel--interactive dashboard-enter group flex h-full flex-col p-6 sm:p-7"
      style={animationDelayMs > 0 ? { animationDelay: `${animationDelayMs}ms` } : undefined}
    >
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-amber/55 to-transparent"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="dashboard-icon-chip h-14 w-14 shrink-0 rounded-[20px]">
            <FileStack size={24} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-amber/90">
              Master Resume
            </p>

            {isRenaming && onRename && onCancelRename ? (
              <div className="mt-3">
                <InlineRename
                  value={resume.title}
                  onSave={(newTitle) => onRename(resume.id, newTitle)}
                  onCancel={onCancelRename}
                  className="text-xl font-semibold sm:text-2xl"
                />
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h3
                  className="group/title inline-flex cursor-text items-center gap-1 truncate text-xl font-semibold tracking-[-0.03em] text-text-primary sm:text-2xl"
                  onDoubleClick={() => onRequestRename(resume.id)}
                  title="Double-click to rename"
                >
                  <span className="truncate">{resume.title}</span>
                  <PencilLine
                    size={13}
                    className="shrink-0 text-text-secondary opacity-0 transition-opacity group-hover/title:opacity-50"
                  />
                </h3>
                {searchMatchLabel ? (
                  <span className="dashboard-chip dashboard-chip--accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    {searchMatchLabel}
                  </span>
                ) : null}
              </div>
            )}

            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              Use this master draft as the source of truth, then attach role-specific
              tailored versions directly inside the project card.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <MainResumeMenu onDelete={() => onRequestDelete(resume.id)} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <div className="dashboard-chip dashboard-chip--accent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]">
          Master Resume
        </div>
        <div className="dashboard-chip px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] tabular-nums">
          {formatTailoredCount(resume.subResumes.length)}
        </div>
        <div className="dashboard-chip px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] tabular-nums">
          Updated {formatDate(resume.updatedAt)}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => onOpen(resume.id)}
          className="dashboard-button dashboard-button--primary h-11 cursor-pointer px-5 text-sm font-semibold"
          aria-label={`Open ${resume.title}`}
        >
          <ArrowUpRight size={15} />
          Open
        </button>
        <button
          type="button"
          onClick={() => onRequestRename(resume.id)}
          className="dashboard-button dashboard-button--secondary h-11 cursor-pointer px-4 text-sm font-medium text-text-primary"
          aria-label={`Rename ${resume.title}`}
        >
          <PencilLine size={15} />
          Rename
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(resume.id)}
          className="dashboard-button dashboard-button--secondary h-11 cursor-pointer px-4 text-sm font-medium text-text-primary"
          aria-label={`Duplicate ${resume.title}`}
        >
          <Copy size={15} />
          Duplicate
        </button>
      </div>

      <section className="mt-6 flex flex-1 flex-col rounded-[26px] border border-[color:var(--dashboard-border-subtle)] bg-[var(--dashboard-panel-hover)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--dashboard-border-subtle)] pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/75">
              Tailored Versions
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Attached role-specific variants live here so the master stays central
              and the tailored work stays obvious.
            </p>
          </div>
          <div className="dashboard-chip px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] tabular-nums">
            {resume.subResumes.length} attached
          </div>
        </div>

        {hasVisibleTailoredVersions ? (
          <div className="mt-4 space-y-3">
            {subResumes.map((sub) => (
              <SubResumeRow
                key={sub.id}
                resume={sub}
                onOpen={onOpen}
                onRequestRename={onRequestRename}
                onDuplicate={onDuplicate}
                onRequestDelete={onRequestDelete}
                isRenaming={renamingId === sub.id}
                onRename={onRename}
                onCancelRename={onCancelRename}
                isMatched={matchedSubResumeIds.includes(sub.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-[color:var(--dashboard-border-subtle)] bg-[rgba(20,21,28,0.48)] p-5">
            <div className="flex items-start gap-3">
              <div className="dashboard-icon-chip mt-0.5 h-10 w-10">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  No tailored versions yet
                </p>
                <p className="mt-2 text-sm leading-7 text-text-secondary">
                  Tailored versions let you customize this master resume for a
                  specific role without losing the main source document.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onCreateSubResume(resume.id)}
              className="dashboard-button dashboard-button--secondary mt-5 h-11 cursor-pointer px-4 text-sm font-medium text-text-primary"
            >
              <Plus size={15} />
              Create tailored version
            </button>
          </div>
        )}
      </section>

      {hasVisibleTailoredVersions ? (
        <button
          type="button"
          onClick={() => onCreateSubResume(resume.id)}
          className="dashboard-button dashboard-button--secondary mt-4 h-11 w-fit cursor-pointer px-4 text-sm font-medium text-text-primary"
        >
          <Plus size={15} />
          Create tailored version
        </button>
      ) : null}
    </article>
  );
}
