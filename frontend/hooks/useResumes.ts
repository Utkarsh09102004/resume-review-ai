"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

/** Shape returned by GET /api/resumes/ */
export interface ResumeFromAPI {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  latex_source: string;
  created_at: string;
  updated_at: string;
}

/** Grouped shape consumed by the dashboard UI */
export interface ResumeGroup {
  id: string;
  title: string;
  updatedAt: string;
  latexSource: string;
  subResumes: {
    id: string;
    title: string;
    updatedAt: string;
  }[];
}

function groupResumes(flat: ResumeFromAPI[]): ResumeGroup[] {
  const mainResumes = flat.filter((r) => r.parent_id === null);
  const subResumes = flat.filter((r) => r.parent_id !== null);

  // Sort mains by updated_at desc
  mainResumes.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return mainResumes.map((main) => {
    const subs = subResumes
      .filter((s) => s.parent_id === main.id)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    return {
      id: main.id,
      title: main.title,
      updatedAt: main.updated_at,
      latexSource: main.latex_source,
      subResumes: subs.map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updated_at,
      })),
    };
  });
}

export function useResumes() {
  const [resumes, setResumes] = useState<ResumeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const resp = await api.get<ResumeFromAPI[]>("/api/resumes/");
      setResumes(groupResumes(resp.data));
    } catch (err) {
      setError("Failed to load resumes");
      console.error("fetchResumes error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const createResume = useCallback(
    async (title: string): Promise<string> => {
      const resp = await api.post<ResumeFromAPI>("/api/resumes/", { title });
      await fetchResumes(true);
      return resp.data.id;
    },
    [fetchResumes]
  );

  const createSubResume = useCallback(
    async (parentId: string, title: string): Promise<string> => {
      const resp = await api.post<ResumeFromAPI>("/api/resumes/", {
        title,
        parent_id: parentId,
      });
      await fetchResumes(true);
      return resp.data.id;
    },
    [fetchResumes]
  );

  const renameResume = useCallback(
    async (id: string, title: string) => {
      await api.put(`/api/resumes/${id}`, { title });
      await fetchResumes(true);
    },
    [fetchResumes]
  );

  const duplicateResume = useCallback(
    async (id: string): Promise<string> => {
      const original = await api.get<ResumeFromAPI>(`/api/resumes/${id}`);
      const resp = await api.post<ResumeFromAPI>("/api/resumes/", {
        title: `${original.data.title} (copy)`,
        latex_source: original.data.latex_source,
      });
      await fetchResumes(true);
      return resp.data.id;
    },
    [fetchResumes]
  );

  const deleteResume = useCallback(
    async (id: string) => {
      await api.delete(`/api/resumes/${id}`);
      await fetchResumes(true);
    },
    [fetchResumes]
  );

  return {
    resumes,
    loading,
    error,
    fetchResumes,
    createResume,
    createSubResume,
    renameResume,
    duplicateResume,
    deleteResume,
  };
}
