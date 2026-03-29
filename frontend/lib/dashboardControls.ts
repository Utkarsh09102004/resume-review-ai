import type { ResumeGroup, SubResumeSummary } from "@/lib/resumes";

export const DASHBOARD_FILTER_VALUES = [
  "all",
  "with-tailored",
  "without-tailored",
] as const;

export const DASHBOARD_SORT_VALUES = [
  "recent",
  "oldest",
  "title-asc",
  "title-desc",
  "most-tailored",
] as const;

export type DashboardFilterValue = (typeof DASHBOARD_FILTER_VALUES)[number];
export type DashboardSortValue = (typeof DASHBOARD_SORT_VALUES)[number];
export type DashboardSearchMatchSource = "base" | "tailored" | "both" | null;

export interface DashboardControlsState {
  query: string;
  filter: DashboardFilterValue;
  sort: DashboardSortValue;
}

export interface VisibleResumeGroup extends ResumeGroup {
  matchedBase: boolean;
  matchedSubResumeIds: string[];
  searchMatchSource: DashboardSearchMatchSource;
  visibleSubResumes: SubResumeSummary[];
}

const DEFAULT_DASHBOARD_FILTER: DashboardFilterValue = "all";
const DEFAULT_DASHBOARD_SORT: DashboardSortValue = "recent";

function isDashboardFilterValue(value: string | null): value is DashboardFilterValue {
  return value !== null && DASHBOARD_FILTER_VALUES.includes(value as DashboardFilterValue);
}

function isDashboardSortValue(value: string | null): value is DashboardSortValue {
  return value !== null && DASHBOARD_SORT_VALUES.includes(value as DashboardSortValue);
}

function normalizeQuery(query: string) {
  return query.trim().toLocaleLowerCase();
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function matchesQuery(title: string, normalizedQuery: string) {
  return title.toLocaleLowerCase().includes(normalizedQuery);
}

function compareIsoDate(a: string, b: string) {
  return new Date(a).getTime() - new Date(b).getTime();
}

function compareResumeGroups(a: ResumeGroup, b: ResumeGroup, sort: DashboardSortValue) {
  switch (sort) {
    case "oldest":
      return compareIsoDate(a.updatedAt, b.updatedAt);
    case "title-asc":
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    case "title-desc":
      return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
    case "most-tailored": {
      const tailoredDifference = b.subResumes.length - a.subResumes.length;

      if (tailoredDifference !== 0) {
        return tailoredDifference;
      }

      return compareIsoDate(b.updatedAt, a.updatedAt);
    }
    case "recent":
    default:
      return compareIsoDate(b.updatedAt, a.updatedAt);
  }
}

function resumeMatchesFilter(resume: ResumeGroup, filter: DashboardFilterValue) {
  if (filter === "with-tailored") {
    return resume.subResumes.length > 0;
  }

  if (filter === "without-tailored") {
    return resume.subResumes.length === 0;
  }

  return true;
}

export function getDefaultDashboardControls(): DashboardControlsState {
  return {
    query: "",
    filter: DEFAULT_DASHBOARD_FILTER,
    sort: DEFAULT_DASHBOARD_SORT,
  };
}

export function parseDashboardControls(searchParams: Pick<URLSearchParams, "get">) {
  const query = searchParams.get("q")?.trim() ?? "";
  const filter = searchParams.get("filter");
  const sort = searchParams.get("sort");

  return {
    query,
    filter: isDashboardFilterValue(filter) ? filter : DEFAULT_DASHBOARD_FILTER,
    sort: isDashboardSortValue(sort) ? sort : DEFAULT_DASHBOARD_SORT,
  } satisfies DashboardControlsState;
}

export function buildDashboardControlsSearchParams(
  state: DashboardControlsState,
  currentSearchParamsString = ""
) {
  const nextSearchParams = new URLSearchParams(currentSearchParamsString);
  const trimmedQuery = state.query.trim();

  if (trimmedQuery) {
    nextSearchParams.set("q", trimmedQuery);
  } else {
    nextSearchParams.delete("q");
  }

  if (state.filter === DEFAULT_DASHBOARD_FILTER) {
    nextSearchParams.delete("filter");
  } else {
    nextSearchParams.set("filter", state.filter);
  }

  if (state.sort === DEFAULT_DASHBOARD_SORT) {
    nextSearchParams.delete("sort");
  } else {
    nextSearchParams.set("sort", state.sort);
  }

  return nextSearchParams;
}

export function hasActiveDashboardControls(state: DashboardControlsState) {
  return (
    state.query.trim().length > 0 ||
    state.filter !== DEFAULT_DASHBOARD_FILTER ||
    state.sort !== DEFAULT_DASHBOARD_SORT
  );
}

export function getVisibleResumeGroups(
  resumes: ResumeGroup[],
  state: DashboardControlsState
): VisibleResumeGroup[] {
  const normalizedQuery = normalizeQuery(state.query);
  const visibleResumes: VisibleResumeGroup[] = [];

  for (const resume of resumes) {
    if (!resumeMatchesFilter(resume, state.filter)) {
      continue;
    }

    const matchedSubResumes = normalizedQuery
      ? resume.subResumes.filter((subResume) => matchesQuery(subResume.title, normalizedQuery))
      : resume.subResumes;
    const matchedBase = normalizedQuery
      ? matchesQuery(resume.title, normalizedQuery)
      : false;

    if (normalizedQuery && !matchedBase && matchedSubResumes.length === 0) {
      continue;
    }

    visibleResumes.push({
      ...resume,
      matchedBase,
      matchedSubResumeIds: normalizedQuery ? matchedSubResumes.map((subResume) => subResume.id) : [],
      searchMatchSource: normalizedQuery
        ? matchedBase && matchedSubResumes.length > 0
          ? "both"
          : matchedBase
            ? "base"
            : "tailored"
        : null,
      visibleSubResumes:
        normalizedQuery && !matchedBase ? matchedSubResumes : resume.subResumes,
    });
  }

  return visibleResumes.sort((a, b) => compareResumeGroups(a, b, state.sort));
}

export function formatDashboardResultsSummary(
  count: number,
  state: Pick<DashboardControlsState, "query" | "filter">
) {
  const parts = [pluralize(count, "resume", "resumes")];
  const trimmedQuery = state.query.trim();

  if (trimmedQuery) {
    parts.push(`matching "${trimmedQuery}"`);
  }

  if (state.filter === "with-tailored") {
    parts.push("with tailored versions");
  }

  if (state.filter === "without-tailored") {
    parts.push("without tailored versions");
  }

  return parts.join(" ");
}
