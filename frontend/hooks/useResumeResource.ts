"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { ResumeFromAPI } from "@/lib/resumes";

interface ResumeResourceState {
  resume: ResumeFromAPI | null;
  parentResume: ResumeFromAPI | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
}

async function fetchParentResume(
  parentId: string
): Promise<ResumeFromAPI | null> {
  try {
    const parentResponse = await api.get<ResumeFromAPI>(`/api/resumes/${parentId}`);
    return parentResponse.data;
  } catch {
    return null;
  }
}

export function useResumeResource(id: string) {
  const [state, setState] = useState<ResumeResourceState>({
    resume: null,
    parentResume: null,
    loading: true,
    notFound: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((current) => ({
        ...current,
        loading: true,
        notFound: false,
        error: null,
      }));

      try {
        const response = await api.get<ResumeFromAPI>(`/api/resumes/${id}`);
        if (cancelled) {
          return;
        }

        const parentResume = response.data.parent_id
          ? await fetchParentResume(response.data.parent_id)
          : null;

        if (cancelled) {
          return;
        }

        setState({
          resume: response.data,
          parentResume,
          loading: false,
          notFound: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const status = (error as { response?: { status?: number } })?.response
          ?.status;

        if (status === 404) {
          setState({
            resume: null,
            parentResume: null,
            loading: false,
            notFound: true,
            error: null,
          });
          return;
        }

        console.error("useResumeResource load error:", error);
        setState({
          resume: null,
          parentResume: null,
          loading: false,
          notFound: false,
          error: "Failed to load resume",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const replaceResume = useCallback((resume: ResumeFromAPI) => {
    setState((current) => ({
      ...current,
      resume,
    }));
  }, []);

  return {
    ...state,
    replaceResume,
  };
}
