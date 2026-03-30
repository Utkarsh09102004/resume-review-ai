"use client";

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  Clock3,
  FileStack,
  Rows3,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import Toolbar from "@/components/Toolbar";
import ResumeGroupCard from "@/components/dashboard/ResumeGroupCard";
import EmptyState from "@/components/dashboard/EmptyState";
import NewResumeButton from "@/components/dashboard/NewResumeButton";
import ConfirmModal from "@/components/ConfirmModal";
import NameResumeModal from "@/components/dashboard/NameResumeModal";
import { useDashboardMutations } from "@/hooks/useDashboardMutations";
import {
  buildDashboardControlsSearchParams,
  formatDashboardResultsSummary,
  getDefaultDashboardControls,
  getVisibleResumeGroups,
  hasActiveDashboardControls,
  parseDashboardControls,
  type DashboardFilterValue,
  type DashboardSortValue,
} from "@/lib/dashboardControls";
import type { UserDisplayInfo } from "@/lib/auth";
import { generateDefaultTitle, generateSubResumeTitle } from "@/lib/resumeDefaults";
import type { ResumeGroup } from "@/lib/resumes";

const METRIC_FORMATTER = new Intl.NumberFormat("en-US");
const RECENT_ACTIVITY_WINDOW_DAYS = 7;
const DEFAULT_DASHBOARD_CONTROLS = getDefaultDashboardControls();
const DASHBOARD_FILTER_OPTIONS: {
  label: string;
  value: DashboardFilterValue;
}[] = [
  { label: "All", value: "all" },
  { label: "With Tailored", value: "with-tailored" },
  { label: "Without Tailored", value: "without-tailored" },
];
const DASHBOARD_SORT_OPTIONS: {
  label: string;
  value: DashboardSortValue;
}[] = [
  { label: "Recently updated", value: "recent" },
  { label: "Oldest updated", value: "oldest" },
  { label: "Title A-Z", value: "title-asc" },
  { label: "Title Z-A", value: "title-desc" },
  { label: "Most tailored", value: "most-tailored" },
];

function findResumeTarget(resumes: ResumeGroup[], id: string) {
  const parentResume = resumes.find(
    (resume) =>
      resume.id === id || resume.subResumes.some((subResume) => subResume.id === id)
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

function enterDelay(delayMs: number): CSSProperties | undefined {
  if (delayMs <= 0) {
    return undefined;
  }

  return { animationDelay: `${delayMs}ms` };
}

function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  helper,
  delayMs = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  delayMs?: number;
}) {
  return (
    <article
      className="dashboard-panel dashboard-panel--interactive dashboard-enter p-5 sm:p-6"
      style={enterDelay(delayMs)}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/80">
          {label}
        </p>
        <span className="dashboard-icon-chip h-11 w-11">
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

function DashboardFilterChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        "dashboard-chip min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "dashboard-chip--accent text-text-primary"
          : "text-text-secondary hover:border-accent-amber/30 hover:text-text-primary",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border",
          active
            ? "border-accent-amber/40 bg-accent-amber/15 text-accent-amber"
            : "border-[color:var(--dashboard-border-subtle)] text-transparent",
        ].join(" ")}
        aria-hidden="true"
      >
        <Check size={11} />
      </span>
      {label}
    </button>
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
    <div className="dashboard-chip px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
      <Icon size={14} />
      {label}
    </div>
  );
}

function InlineErrorPanel({
  eyebrow,
  title,
  description,
  onRetry,
}: {
  eyebrow: string;
  title: string;
  description: string;
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
              {eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              {description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="dashboard-button inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-status-error/35 px-4 text-sm font-medium text-text-primary hover:bg-status-error/10"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function NoResultsPanel({
  query,
  onClearFilters,
  onCreateResume,
}: {
  query: string;
  onClearFilters: () => void;
  onCreateResume: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[color:var(--dashboard-border-subtle)] bg-[var(--dashboard-panel-hover)] p-6 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-secondary/80">
        No results
      </p>
      <h3 className="mt-3 text-xl font-semibold text-text-primary">
        {query.trim()
          ? `No resumes match "${query.trim()}".`
          : "No resumes match this view."}
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
        Try a broader search, switch back to a wider filter, or create a new
        base resume from here.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onClearFilters}
          className="dashboard-button dashboard-button--secondary h-11 px-4 text-sm font-medium text-text-primary"
        >
          Clear filters
        </button>
        <NewResumeButton
          onClick={onCreateResume}
          label="Create Resume"
          variant="primary"
        />
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
  const pathname = usePathname() ?? "/dashboard";
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";
  const syncedSearchParamsRef = useRef(searchParamsString);
  const parsedControls = parseDashboardControls(searchParams ?? new URLSearchParams());
  const [isRouting, startRoutingTransition] = useTransition();
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    title: string;
  }>({ open: false, id: "", title: "" });
  const [query, setQuery] = useState(parsedControls.query);
  const [filter, setFilter] = useState<DashboardFilterValue>(parsedControls.filter);
  const [sort, setSort] = useState<DashboardSortValue>(parsedControls.sort);
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
  const deferredQuery = useDeferredValue(query);
  const loadError = initialError;
  const mutationError = loadError ? null : actionError;
  const baseResumeCount = resumes.length;
  const tailoredResumeCount = countTailoredResumes(resumes);
  const recentlyUpdatedCount = countRecentlyUpdated(resumes);
  const hasResumes = resumes.length > 0;
  const visibleResumes = getVisibleResumeGroups(resumes, {
    query: deferredQuery,
    filter,
    sort,
  });
  const hasVisibleResumes = visibleResumes.length > 0;
  const controlsDisabled = Boolean(loadError) || !hasResumes;
  const hasActiveControls = hasActiveDashboardControls({ query, filter, sort });
  const resultSummary = loadError
    ? "Dashboard unavailable"
    : hasResumes
      ? formatDashboardResultsSummary(visibleResumes.length, {
          query: deferredQuery,
          filter,
        })
      : "No resume projects yet";
  const resultsHelperText = loadError
    ? "Reload to restore dashboard controls."
    : !hasResumes
      ? "Create a base resume to unlock search, filters, and sorting."
      : isRouting
        ? "Updating the shareable dashboard URL."
        : "Search base resume titles and tailored versions from one workspace.";

  useEffect(() => {
    syncedSearchParamsRef.current = searchParamsString;
  }, [searchParamsString]);

  useEffect(() => {
    const nextSearchParams = buildDashboardControlsSearchParams(
      { query, filter, sort },
      searchParamsString
    );
    const nextSearchParamsString = nextSearchParams.toString();

    if (nextSearchParamsString === syncedSearchParamsRef.current) {
      return;
    }

    syncedSearchParamsRef.current = nextSearchParamsString;
    startRoutingTransition(() => {
      router.replace(
        nextSearchParamsString ? `${pathname}?${nextSearchParamsString}` : pathname,
        { scroll: false }
      );
    });
  }, [filter, pathname, query, router, searchParamsString, sort]);

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
    const parent = resumes.find((resume) => resume.id === parentId);
    const defaultName = parent
      ? generateSubResumeTitle(parent.title, parent.subResumes.length)
      : "Untitled Tailored Version";
    setNameModal({ open: true, parentId, defaultName });
  }

  function handleNewResume() {
    const defaultName = generateDefaultTitle(resumes.map((resume) => resume.title));
    setNameModal({ open: true, parentId: null, defaultName });
  }

  function handleResetControls() {
    setQuery(DEFAULT_DASHBOARD_CONTROLS.query);
    setFilter(DEFAULT_DASHBOARD_CONTROLS.filter);
    setSort(DEFAULT_DASHBOARD_CONTROLS.sort);
  }

  function handleRetry() {
    clearActionError();
    router.refresh();
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
    <div className="dashboard-app flex min-h-dvh flex-col bg-bg-deep">
      <Toolbar user={user} />

      <main className="dashboard-shell flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10 lg:px-8 lg:py-10">
          <section className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <div
              className="dashboard-panel dashboard-panel--strong dashboard-panel--hero dashboard-enter p-6 sm:p-8 lg:col-span-7 lg:p-10"
              style={enterDelay(0)}
            >
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-amber/90">
                  Resume Workspace
                </p>
                <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-text-primary sm:text-6xl">
                  My Resumes
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
                  Start from a master resume, spin up tailored versions for each
                  role, and pick up the latest draft without leaving the
                  workspace.
                </p>
                <div className="mt-8 flex flex-wrap gap-3 text-text-secondary">
                  <div className="dashboard-chip px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Base resume first
                  </div>
                  <div className="dashboard-chip px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Tailored versions attached in each card
                  </div>
                  <div className="dashboard-chip px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Continue from recent work
                  </div>
                </div>
              </div>
            </div>

            <aside
              className="dashboard-panel dashboard-panel--cta dashboard-enter p-6 sm:p-8 lg:col-span-5"
              style={enterDelay(40)}
            >
              <div
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-amber/60 to-transparent"
                aria-hidden="true"
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/80">
                Primary Action
              </p>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                    Create a new base resume
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">
                    Launch a fresh master resume here, then branch tailored
                    versions underneath it when a role needs a custom story.
                  </p>
                </div>
                <span className="dashboard-chip dashboard-chip--accent hidden px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] sm:inline-flex">
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

              <div className="mt-5 rounded-[22px] border border-[color:var(--dashboard-border-subtle)] bg-[rgba(29,30,39,0.58)] p-4">
                <div className="flex items-start gap-3">
                  <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-accent-amber" />
                  <p className="text-sm leading-7 text-text-secondary">
                    The toolbar stays product-level on this screen. Creation
                    starts in the hero, while editing and branching continue in
                    the workspace below.
                  </p>
                </div>
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
              delayMs={80}
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
              delayMs={120}
            />
            <DashboardMetricCard
              icon={Clock3}
              label="Recently Updated"
              value={formatMetric(recentlyUpdatedCount)}
              helper={`Updated in the last ${RECENT_ACTIVITY_WINDOW_DAYS} days`}
              delayMs={160}
            />
          </section>

          <section className="space-y-5 lg:space-y-6">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/75">
                  Results
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                  Resume library
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
                  Open a base resume, branch a tailored version, or continue
                  from the most recently updated project.
                </p>
              </div>
            </div>

            <div
              className="dashboard-panel dashboard-enter p-5 sm:p-6"
              style={enterDelay(200)}
            >
              <div className="flex flex-col gap-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] xl:items-end">
                  <div className="space-y-2">
                    <label
                      htmlFor="dashboard-search"
                      className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/75"
                    >
                      Search
                    </label>
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                      />
                      <input
                        id="dashboard-search"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search resumes and tailored versions"
                        disabled={controlsDisabled}
                        className="h-12 w-full rounded-2xl border border-[color:var(--dashboard-border-subtle)] bg-[rgba(29,30,39,0.58)] pl-11 pr-11 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:border-accent-amber/35 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      {query ? (
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-text-primary"
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/75">
                      Filters
                    </p>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label="Filter resumes"
                    >
                      {DASHBOARD_FILTER_OPTIONS.map((option) => (
                        <DashboardFilterChip
                          key={option.value}
                          label={option.label}
                          active={filter === option.value}
                          disabled={controlsDisabled}
                          onClick={() => setFilter(option.value)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="dashboard-sort"
                      className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/75"
                    >
                      Sort
                    </label>
                    <div className="relative min-w-[14rem]">
                      <ArrowDownUp
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                      />
                      <select
                        id="dashboard-sort"
                        value={sort}
                        onChange={(event) =>
                          setSort(event.target.value as DashboardSortValue)
                        }
                        disabled={controlsDisabled}
                        className="h-12 w-full appearance-none rounded-2xl border border-[color:var(--dashboard-border-subtle)] bg-[rgba(29,30,39,0.58)] pl-11 pr-4 text-sm text-text-primary outline-none transition-colors focus:border-accent-amber/35 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {DASHBOARD_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-[color:var(--dashboard-border-subtle)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    aria-live="polite"
                    className="text-sm font-medium text-text-primary"
                  >
                    {resultSummary}
                  </p>
                  {hasActiveControls && hasResumes && !loadError ? (
                    <button
                      type="button"
                      onClick={handleResetControls}
                      className="dashboard-button dashboard-button--secondary h-10 px-4 text-sm font-medium text-text-primary"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <ControlSlotChip icon={Search} label="Search" />
                      <ControlSlotChip icon={SlidersHorizontal} label="Filters" />
                      <ControlSlotChip icon={ArrowDownUp} label="Sort" />
                    </div>
                  )}
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-text-secondary/80">
                  {resultsHelperText}
                </p>
              </div>
            </div>

            <div
              className="dashboard-panel dashboard-enter p-4 sm:p-6 lg:p-7"
              style={enterDelay(240)}
            >
              {mutationError ? (
                <div className="mb-5">
                  <InlineErrorPanel
                    eyebrow="Action unavailable"
                    title="That change didn&apos;t go through."
                    description={mutationError}
                    onRetry={handleRetry}
                  />
                </div>
              ) : null}

              {loadError ? (
                <InlineErrorPanel
                  eyebrow="Workspace unavailable"
                  title="We couldn&apos;t load your dashboard right now."
                  description={loadError}
                  onRetry={handleRetry}
                />
              ) : !hasResumes ? (
                <EmptyState onCreate={handleNewResume} />
              ) : !hasVisibleResumes ? (
                <NoResultsPanel
                  query={query}
                  onClearFilters={handleResetControls}
                  onCreateResume={handleNewResume}
                />
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-2 border-b border-[color:var(--dashboard-border-subtle)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary/75">
                        Content
                      </p>
                      <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-text-primary">
                        {hasActiveControls
                          ? "Filtered resume projects"
                          : "All resume projects"}
                      </h3>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Search keeps base resumes visible when tailored versions
                      match, with matching variants preserved inside each
                      project card.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {visibleResumes.map((resume, index) => (
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
                        animationDelayMs={280 + index * 40}
                        visibleSubResumes={resume.visibleSubResumes}
                        matchedSubResumeIds={resume.matchedSubResumeIds}
                        searchMatchSource={resume.searchMatchSource}
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
