"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { ResumeFromAPI } from "./useResumes";

export interface ResumeEditorState {
  resume: ResumeFromAPI | null;
  parentResume: ResumeFromAPI | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  isSaving: boolean;
}

export function useResumeEditor(id: string) {
  const [resume, setResume] = useState<ResumeFromAPI | null>(null);
  const [parentResume, setParentResume] = useState<ResumeFromAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setNotFound(false);
        setError(null);

        const resp = await api.get<ResumeFromAPI>(`/api/resumes/${id}`);
        if (cancelled) return;
        setResume(resp.data);

        // Fetch parent if this is a sub-resume
        if (resp.data.parent_id) {
          try {
            const parentResp = await api.get<ResumeFromAPI>(
              `/api/resumes/${resp.data.parent_id}`
            );
            if (!cancelled) setParentResume(parentResp.data);
          } catch {
            // Parent may have been deleted; non-fatal
            if (!cancelled) setParentResume(null);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setError("Failed to load resume");
          console.error("useResumeEditor load error:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = useCallback(
    async (updates: { title?: string; latex_source?: string }) => {
      if (!resume) return;
      try {
        setIsSaving(true);
        const resp = await api.put<ResumeFromAPI>(
          `/api/resumes/${resume.id}`,
          updates
        );
        setResume(resp.data);
      } catch (err) {
        console.error("Save error:", err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [resume]
  );

  return {
    resume,
    parentResume,
    loading,
    notFound,
    error,
    isSaving,
    save,
  };
}
