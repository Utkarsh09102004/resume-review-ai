"use client";

import { useCallback, useState } from "react";
import api from "@/lib/api";
import type { ResumeFromAPI } from "@/lib/resumes";

interface ResumeUpdates {
  title?: string;
  latex_source?: string;
}

export function useResumeSave(resumeId: string | null) {
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (updates: ResumeUpdates) => {
      if (!resumeId) {
        return null;
      }

      try {
        setIsSaving(true);
        const response = await api.put<ResumeFromAPI>(
          `/api/resumes/${resumeId}`,
          updates
        );
        return response.data;
      } finally {
        setIsSaving(false);
      }
    },
    [resumeId]
  );

  return {
    isSaving,
    save,
  };
}
