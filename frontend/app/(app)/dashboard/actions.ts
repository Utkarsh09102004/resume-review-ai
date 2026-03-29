"use server";

import { isAxiosError } from "axios";
import { revalidatePath } from "next/cache";
import { requireUserDisplayInfo } from "@/lib/auth";
import { createAuthenticatedApi } from "@/lib/api";
import type { ResumeFromAPI } from "@/lib/resumes";

const DASHBOARD_PATH = "/dashboard";

export type DashboardActionResult =
  | { ok: true; resumeId?: string }
  | { ok: false; error: string };

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data;
    if (
      detail &&
      typeof detail === "object" &&
      "detail" in detail &&
      typeof detail.detail === "string"
    ) {
      return detail.detail;
    }
  }

  return fallback;
}

function normalizeTitle(title: string): string {
  return title.trim();
}

async function revalidateDashboard() {
  revalidatePath(DASHBOARD_PATH);
}

export async function createResumeAction(
  title: string
): Promise<DashboardActionResult> {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    return { ok: false, error: "Resume name is required" };
  }

  try {
    await requireUserDisplayInfo();
    const client = await createAuthenticatedApi();
    const response = await client.post<ResumeFromAPI>("/api/resumes/", {
      title: normalizedTitle,
    });
    await revalidateDashboard();
    return { ok: true, resumeId: response.data.id };
  } catch (error) {
    console.error("createResumeAction error:", error);
    return {
      ok: false,
      error: getApiErrorMessage(error, "Failed to create resume"),
    };
  }
}

export async function createSubResumeAction(
  parentId: string,
  title: string
): Promise<DashboardActionResult> {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    return { ok: false, error: "Resume name is required" };
  }

  try {
    await requireUserDisplayInfo();
    const client = await createAuthenticatedApi();
    const response = await client.post<ResumeFromAPI>("/api/resumes/", {
      title: normalizedTitle,
      parent_id: parentId,
    });
    await revalidateDashboard();
    return { ok: true, resumeId: response.data.id };
  } catch (error) {
    console.error("createSubResumeAction error:", error);
    return {
      ok: false,
      error: getApiErrorMessage(error, "Failed to create sub-resume"),
    };
  }
}

export async function renameResumeAction(
  id: string,
  title: string
): Promise<DashboardActionResult> {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    return { ok: false, error: "Resume name is required" };
  }

  try {
    await requireUserDisplayInfo();
    const client = await createAuthenticatedApi();
    await client.put(`/api/resumes/${id}`, { title: normalizedTitle });
    await revalidateDashboard();
    return { ok: true };
  } catch (error) {
    console.error("renameResumeAction error:", error);
    return {
      ok: false,
      error: getApiErrorMessage(error, "Failed to rename resume"),
    };
  }
}

export async function duplicateResumeAction(
  id: string
): Promise<DashboardActionResult> {
  try {
    await requireUserDisplayInfo();
    const client = await createAuthenticatedApi();
    const original = await client.get<ResumeFromAPI>(`/api/resumes/${id}`);
    const response = await client.post<ResumeFromAPI>("/api/resumes/", {
      title: `${original.data.title} (copy)`,
      latex_source: original.data.latex_source,
    });
    await revalidateDashboard();
    return { ok: true, resumeId: response.data.id };
  } catch (error) {
    console.error("duplicateResumeAction error:", error);
    return {
      ok: false,
      error: getApiErrorMessage(error, "Failed to duplicate resume"),
    };
  }
}

export async function deleteResumeAction(
  id: string
): Promise<DashboardActionResult> {
  try {
    await requireUserDisplayInfo();
    const client = await createAuthenticatedApi();
    await client.delete(`/api/resumes/${id}`);
    await revalidateDashboard();
    return { ok: true };
  } catch (error) {
    console.error("deleteResumeAction error:", error);
    return {
      ok: false,
      error: getApiErrorMessage(error, "Failed to delete resume"),
    };
  }
}
