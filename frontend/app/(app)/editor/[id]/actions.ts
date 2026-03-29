"use server";

import axios from "axios";
import { revalidatePath } from "next/cache";
import {
  createAuthenticatedApi,
  isMissingAuthenticatedTokenError,
} from "@/lib/api";
import { requireUserDisplayInfo } from "@/lib/auth";
import type { ResumeFromAPI } from "@/lib/resumes";

const AUTHENTICATION_ERROR = "Authentication required. Please sign in again.";

interface ResumeUpdateInput {
  title?: string;
  latex_source?: string;
}

async function updateResume(
  resumeId: string,
  updates: ResumeUpdateInput
): Promise<ResumeFromAPI> {
  await requireUserDisplayInfo();

  try {
    const api = await createAuthenticatedApi();
    const response = await api.put<ResumeFromAPI>(
      `/api/resumes/${resumeId}`,
      updates
    );
    revalidatePath("/dashboard");
    revalidatePath(`/editor/${resumeId}`);
    return response.data;
  } catch (error) {
    if (isMissingAuthenticatedTokenError(error)) {
      throw new Error(AUTHENTICATION_ERROR);
    }

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Resume not found");
    }

    throw new Error("Failed to update resume");
  }
}

export async function renameResumeAction(
  resumeId: string,
  title: string
): Promise<ResumeFromAPI> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("Resume title is required");
  }

  return updateResume(resumeId, { title: trimmedTitle });
}

export async function saveResumeLatexAction(
  resumeId: string,
  latexSource: string
): Promise<ResumeFromAPI> {
  return updateResume(resumeId, { latex_source: latexSource });
}
