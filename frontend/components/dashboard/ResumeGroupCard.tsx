import { ArrowUpRight, Copy, FileStack, PencilLine, Plus, Sparkles } from "lucide-react";
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
}: ResumeGroupCardProps) {
  const isRenaming = renamingId === resume.id;
  const hasTailoredVersions = resume.subResumes.length > 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[30px] border border-bg-border/85 bg-[linear-gradient(180deg,rgba(34,34,44,0.96),rgba(21,21,29,0.94))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition-all hover:-translate-y-0.5 hover:border-accent-amber/28 hover:shadow-[0_30px_85px_rgba(0,0,0,0.3)] sm:p-7">
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-amber/55 to-transparent"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-accent-amber/18 bg-accent-amber/10 text-accent-amber shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <FileStack size={24} />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-amber/90">
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
              <h3
                className="mt-3 truncate text-xl font-semibold tracking-tight text-text-primary sm:text-2xl cursor-text"
                onDoubleClick={() => onRequestRename(resume.id)}
                title="Double-click to rename"
              >
                {resume.title}
              </h3>
            )}

            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              Use this master draft as the source of truth, then attach role-specific tailored versions directly inside the project card.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <MainResumeMenu onDelete={() => onRequestDelete(resume.id)} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <div className="rounded-full border border-bg-border/80 bg-bg-elevated/55 px-3 py-1.5 text-xs font-medium text-text-primary">
          Master Resume
        </div>
        <div className="rounded-full border border-bg-border/80 bg-bg-elevated/55 px-3 py-1.5 text-xs font-medium tabular-nums text-text-secondary">
          {formatTailoredCount(resume.subResumes.length)}
        </div>
        <div className="rounded-full border border-bg-border/80 bg-bg-elevated/55 px-3 py-1.5 text-xs font-medium tabular-nums text-text-secondary">
          Updated {formatDate(resume.updatedAt)}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => onOpen(resume.id)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-amber px-5 text-sm font-semibold text-bg-deep transition hover:brightness-110 cursor-pointer"
          aria-label={`Open ${resume.title}`}
        >
          <ArrowUpRight size={15} />
          Open
        </button>
        <button
          type="button"
          onClick={() => onRequestRename(resume.id)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-bg-border/80 bg-bg-elevated/45 px-4 text-sm font-medium text-text-primary transition-colors hover:border-accent-amber/30 hover:text-accent-amber cursor-pointer"
          aria-label={`Rename ${resume.title}`}
        >
          <PencilLine size={15} />
          Rename
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(resume.id)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-bg-border/80 bg-bg-elevated/45 px-4 text-sm font-medium text-text-primary transition-colors hover:border-accent-amber/30 hover:text-accent-amber cursor-pointer"
          aria-label={`Duplicate ${resume.title}`}
        >
          <Copy size={15} />
          Duplicate
        </button>
      </div>

      <section className="mt-6 flex flex-1 flex-col rounded-[26px] border border-bg-border/80 bg-bg-deep/30 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-bg-border/70 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-secondary/75">
              Tailored Versions
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Attached role-specific variants live here so the master stays central and the tailored work stays obvious.
            </p>
          </div>
          <div className="rounded-full border border-bg-border/75 bg-bg-elevated/45 px-3 py-1.5 text-xs font-medium tabular-nums text-text-secondary">
            {resume.subResumes.length} attached
          </div>
        </div>

        {hasTailoredVersions ? (
          <div className="mt-4 space-y-3">
            {resume.subResumes.map((sub) => (
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
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-bg-border/80 bg-bg-elevated/30 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent-amber/18 bg-accent-amber/10 text-accent-amber">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  No tailored versions yet
                </p>
                <p className="mt-2 text-sm leading-7 text-text-secondary">
                  Tailored versions let you customize this master resume for a specific role without losing the main source document.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onCreateSubResume(resume.id)}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-bg-border/80 bg-bg-surface/70 px-4 text-sm font-medium text-text-primary transition-colors hover:border-accent-amber/30 hover:text-accent-amber cursor-pointer"
            >
              <Plus size={15} />
              Create tailored version
            </button>
          </div>
        )}
      </section>

      {hasTailoredVersions ? (
        <button
          type="button"
          onClick={() => onCreateSubResume(resume.id)}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl border border-bg-border/80 bg-bg-elevated/45 px-4 text-sm font-medium text-text-primary transition-colors hover:border-accent-amber/30 hover:text-accent-amber cursor-pointer"
        >
          <Plus size={15} />
          Create tailored version
        </button>
      ) : null}
    </article>
  );
}
