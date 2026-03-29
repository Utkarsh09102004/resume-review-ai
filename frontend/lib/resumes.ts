export interface ResumeFromAPI {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  latex_source: string;
  created_at: string;
  updated_at: string;
}

export interface SubResumeSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ResumeGroup {
  id: string;
  title: string;
  updatedAt: string;
  latexSource: string;
  subResumes: SubResumeSummary[];
}

export function groupResumes(flat: ResumeFromAPI[]): ResumeGroup[] {
  const sortedResumes = [...flat].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const mainResumes: ResumeFromAPI[] = [];
  const subResumesByParent = new Map<string, SubResumeSummary[]>();

  for (const resume of sortedResumes) {
    if (resume.parent_id === null) {
      mainResumes.push(resume);
      continue;
    }

    const subResumes = subResumesByParent.get(resume.parent_id) ?? [];
    subResumes.push({
      id: resume.id,
      title: resume.title,
      updatedAt: resume.updated_at,
    });
    subResumesByParent.set(resume.parent_id, subResumes);
  }

  return mainResumes.map((resume) => ({
    id: resume.id,
    title: resume.title,
    updatedAt: resume.updated_at,
    latexSource: resume.latex_source,
    subResumes: subResumesByParent.get(resume.id) ?? [],
  }));
}
