"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Clock3,
  FileStack,
  Rows3,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import Toolbar from "@/components/Toolbar";
import ResumeGroupCard from "@/components/dashboard/ResumeGroupCard";
import EmptyState from "@/components/dashboard/EmptyState";
import NewResumeButton from "@/components/dashboard/NewResumeButton";
import ConfirmModal from "@/components/ConfirmModal";
import NameResumeModal from "@/components/dashboard/NameResumeModal";
import { useDashboardMutations } from "@/hooks/useDashboardMutations";
import {
  generateDefaultTitle,
  generateSubResumeTitle,
} from "@/lib/resumeDefaults";
import type { UserDisplayInfo } from "@/lib/auth";
import type { ResumeGroup } from "@/lib/resumes";

const METRIC_FORMATTER = new Intl.NumberFormat("en-US");
const RECENT_ACTIVITY_WINDOW_DAYS = 7;

function findResumeTarget(resumes: ResumeGroup[], id: string) {
  const parentResume = resumes.find(
    (resume) => resume.id === id || resume.subResumes.some((subResume) => subResume.id === id)
  );

  if (!parentResume) {
    return null;
  }

  return parentResume.id === id
    ? { id: parentResume.id, title: parentResume.title }
    : parentResume.subResumes.find((subResume) => subResume.id === id) ?? null;
}

function formatMetric(value: number) {
  return METRIC_FORMATTER.format(value);
}

function countTailoredResumes(resumes: ResumeGroup[]) {
  return resumes.reduce((total, resume) => total + resume.subResumes.length, 0);
}

function countRecentlyUpdated(resumes: ResumeGroup[]) {
  const cutoff = Date.now() - RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return resumes.reduce((total, resume) => {
    const documents = [resume.updatedAt, ...resume.subResumes.map((subResume) => subResume.updatedAt)];

    return (
      total +
      documents.filter((timestamp) => new Date(timestamp).getTime() >= cutoff).length
    );
  }, 0);
}

function pluralize(value: number, singular: string, plural: string) {
  return `${formatMetric(value)} ${value === 1 ? singular : plural}`;
}

function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[24px] border border-bg-border/80 bg-bg-surface/85 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-secondary/80">
          {label}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-bg-border/80 bg-bg-elevated/80 text-accent-amber">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-6 text-3xl font-semibold tracking-tight tabular-nums text-text-primary">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{helper}</p>
    </article>
  );
}

function ControlSlotChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-bg-border/80 bg-bg-elevated/60 px-3 py-2 text-xs font-medium text-text-secondary">
      <Icon size={14} />
      {label}
    </div>
  );
}

function InlineErrorPanel({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-status-error/35 bg-status-error/10 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-status-error/20 bg-status-error/10 text-status-error">
            <TriangleAlert size={18} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-status-error/90">
              Workspace unavailable
            </p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">
              We couldn&apos;t load your dashboard right now.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              {error}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-status-error/35 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-status-error/10"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function DashboardPageClient({
  user,
  resumes,
  initialError,
}: {
  user: UserDisplayInfo;
  resumes: ResumeGroup[];
  initialError: string | null;
}) {
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    title: string;
  }>({ open: false, id: "", title: "" });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nameModal, setNameModal] = useState<{
    open: boolean;
    parentId: string | null;
    defaultName: string;
  }>({ open: false, parentId: null, defaultName: "" });
  const {
    isMutating,
    actionError,
    clearActionError,
    createResume,
    createSubResume,
    duplicateResume,
    renameResume,
    deleteResume,
  } = useDashboardMutations({
    openResume: (resumeId) => router.push(`/editor/${resumeId}`),
    refresh: () => router.refresh(),
  });
  const error = actionError ?? initialError;
  const baseResumeCount = resumes.length;
  const tailoredResumeCount = countTailoredResumes(resumes);
  const recentlyUpdatedCount = countRecentlyUpdated(resumes);
  const totalResumeDocuments = baseResumeCount + tailoredResumeCount;
  const hasResumes = resumes.length > 0;
  const resultSummary = hasResumes
    ? `${pluralize(totalResumeDocuments, "resume document", "resume documents")} across ${pluralize(baseResumeCount, "base project", "base projects")}`
    : "Start a base resume here, then branch tailored versions as opportunities change.";

  function handleOpen(id: string) {
    router.push(`/editor/${id}`);
  }

  async function handleDuplicate(id: string) {
    if (isMutating) return;
    await duplicateResume(id);
  }

  function handleRequestDelete(id: string) {
    const target = findResumeTarget(resumes, id);
    if (!target) {
      return;
    }

    setDeleteModal({ open: true, id, title: target.title });
  }

  function handleRequestRename(id: string) {
    setRenamingId(id);
  }

  function handleCreateSubResume(parentId: string) {
    const parent = resumes.find((r) => r.id === parentId);
    const defaultName = parent
      ? generateSubResumeTitle(parent.title, parent.subResumes.length)
      : "Untitled Tailored Version";
    setNameModal({ open: true, parentId, defaultName });
  }

  function handleNewResume() {
    const defaultName = generateDefaultTitle(resumes.map((r) => r.title));
    setNameModal({ open: true, parentId: null, defaultName });
  }

  async function handleNameModalConfirm(name: string) {
    if (isMutating) return;

    const parentId = nameModal.parentId;
    setNameModal({ open: false, parentId: null, defaultName: "" });

    if (parentId) {
      await createSubResume(parentId, name);
    } else {
      await createResume(name);
    }
  }

  async function handleDeleteConfirm() {
    if (isMutating) return;

    const id = deleteModal.id;
    setDeleteModal({ open: false, id: "", title: "" });
    await deleteResume(id);
  }

  async function handleRename(id: string, newTitle: string) {
    if (isMutating) return;

    await renameResume(id, newTitle);
    setRenamingId(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-deep">
      <Toolbar user={user} />

      <main className="dashboard-shell flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10 lg:px-8 lg:py-10">
          <section className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <div className="relative overflow-hidden rounded-[32px] border border-bg-border/80 bg-[linear-gradient(135deg,rgba(30,30,40,0.98),rgba(22,22,30,0.92))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:col-span-7 lg:p-10">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,168,69,0.18),transparent_40%),linear-gradient(180deg,transparent,rgba(15,15,20,0.32))]"
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-amber/90">
                  Resume Workspace
                </p>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
                  My Resumes
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
                  Start from a master resume, spin up tailored versions for each
                  role, and pick up the latest draft without leaving the
                  workspace.
                </p>
                <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-text-secondary">
                  <div className="rounded-full border border-bg-border/80 bg-bg-elevated/60 px-3 py-2">
                    Base resume first
                  </div>
                  <div className="rounded-full border border-bg-border/80 bg-bg-elevated/60 px-3 py-2">
                    Tailored versions attached in each card
                  </div>
                  <div className="rounded-full border border-bg-border/80 bg-bg-elevated/60 px-3 py-2">
                    Continue from recent work
                  </div>
                </div>
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[32px] border border-bg-border/80 bg-bg-surface/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-8 lg:col-span-5">
              <div
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-amber/60 to-transparent"
                aria-hidden="true"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-text-secondary/80">
                Primary Action
              </p>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                    Create a new base resume
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">
                    Launch a fresh master resume here, then branch tailored
                    versions underneath it when a role needs a custom story.
                  </p>
                </div>
                <span className="hidden rounded-full border border-accent-amber/25 bg-accent-amber/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-amber sm:inline-flex">
                  Hero CTA
                </span>
              </div>

              <div className="mt-7">
                <NewResumeButton
                  onClick={handleNewResume}
                  variant="primary"
                  fullWidth
                />
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-bg-border/80 bg-bg-elevated/45 p-4">
                <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-accent-amber" />
                <p className="text-sm leading-7 text-text-secondary">
                  The toolbar stays product-level on this screen. Creation
                  starts in the hero, while editing and branching continue in
                  the workspace below.
                </p>
              </div>
            </aside>
          </section>

          <section className="grid gap-4 md:grid-cols-3 md:gap-5">
            <DashboardMetricCard
              icon={Rows3}
              label="Base Resumes"
              value={formatMetric(baseResumeCount)}
              helper={
                hasResumes
                  ? `${pluralize(baseResumeCount, "primary resume", "primary resumes")} anchoring your workspace`
                  : "No base resumes yet"
              }
            />
            <DashboardMetricCard
              icon={FileStack}
              label="Tailored Versions"
              value={formatMetric(tailoredResumeCount)}
              helper={
                tailoredResumeCount > 0
                  ? `${pluralize(tailoredResumeCount, "version", "versions")} attached to base resumes`
                  : "No tailored versions yet"
              }
            />
            <DashboardMetricCard
              icon={Clock3}
              label="Recently Updated"
              value={formatMetric(recentlyUpdatedCount)}
              helper={`Updated in the last ${RECENT_ACTIVITY_WINDOW_DAYS} days`}
            />
          </section>

          <section className="space-y-5 lg:space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-text-secondary/75">
                  Results
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">
                  Resume library
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
                  Open a base resume, branch a tailored version, or continue
                  from the most recently updated project.
                </p>
              </div>
              <div className="rounded-full border border-bg-border/80 bg-bg-surface/80 px-4 py-2 text-xs font-medium tracking-[0.18em] text-text-secondary uppercase">
                {resultSummary}
              </div>
            </div>

            <div className="rounded-[28px] border border-bg-border/80 bg-bg-surface/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-sm sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-secondary/75">
                    Controls Slot
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
                    Search, filters, and sort controls land here next. This
                    shell keeps their footprint stable before the behavior work
                    ships.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ControlSlotChip icon={Search} label="Search" />
                  <ControlSlotChip icon={SlidersHorizontal} label="Filters" />
                  <ControlSlotChip icon={ArrowDownUp} label="Sort" />
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-bg-border/80 bg-bg-surface/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6 lg:p-7">
              {error ? (
                <InlineErrorPanel
                  error={error}
                  onRetry={() => {
                    clearActionError();
                    router.refresh();
                  }}
                />
              ) : resumes.length === 0 ? (
                <EmptyState onCreate={handleNewResume} />
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-2 border-b border-bg-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-secondary/75">
                        Content
                      </p>
                      <h3 className="mt-3 text-xl font-semibold text-text-primary">
                        All resume projects
                      </h3>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Base resumes anchor each project card, with tailored
                      versions attached inside a dedicated section.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {resumes.map((resume) => (
                      <ResumeGroupCard
                        key={resume.id}
                        resume={resume}
                        onOpen={handleOpen}
                        onRequestRename={handleRequestRename}
                        onDuplicate={handleDuplicate}
                        onCreateSubResume={handleCreateSubResume}
                        onRequestDelete={handleRequestDelete}
                        renamingId={renamingId}
                        onRename={handleRename}
                        onCancelRename={() => setRenamingId(null)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: "", title: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete Resume"
        message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
        isPending={isMutating}
      />

      <NameResumeModal
        open={nameModal.open}
        onClose={() =>
          setNameModal({ open: false, parentId: null, defaultName: "" })
        }
        onConfirm={handleNameModalConfirm}
        title={
          nameModal.parentId ? "Name Your Tailored Version" : "Name Your Resume"
        }
        defaultName={nameModal.defaultName}
        confirmLabel={
          nameModal.parentId ? "Create tailored version" : "Create resume"
        }
        pendingLabel={
          nameModal.parentId ? "Creating tailored version..." : "Creating resume..."
        }
        isPending={isMutating}
      />
    </div>
  );
}
