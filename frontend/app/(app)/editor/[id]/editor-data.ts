import "server-only";

import axios from "axios";
import { createAuthenticatedApiRSC } from "@/lib/api";
import type { ResumeFromAPI } from "@/lib/resumes";

export interface EditorPageData {
  resume: ResumeFromAPI;
  parentResume: ResumeFromAPI | null;
}

async function getResumeOrNull(id: string): Promise<ResumeFromAPI | null> {
  const api = await createAuthenticatedApiRSC();

  try {
    const response = await api.get<ResumeFromAPI>(`/api/resumes/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getEditorPageData(
  id: string
): Promise<EditorPageData | null> {
  const resume = await getResumeOrNull(id);
  if (!resume) {
    return null;
  }

  const parentResume = resume.parent_id
    ? await getResumeOrNull(resume.parent_id)
    : null;

  return {
    resume,
    parentResume,
  };
}
