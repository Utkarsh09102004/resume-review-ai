"use client";

import { useCallback, useState } from "react";
import {
  createResumeAction,
  createSubResumeAction,
  deleteResumeAction,
  duplicateResumeAction,
  renameResumeAction,
} from "@/app/(app)/dashboard/actions";

interface DashboardMutationOptions {
  openResume: (resumeId: string) => void;
  refresh: () => void;
}

export function useDashboardMutations({
  openResume,
  refresh,
}: DashboardMutationOptions) {
  const [isMutating, setIsMutating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runMutation = useCallback(
    async (
      task: () => Promise<{ ok: boolean; error?: string; resumeId?: string }>,
      onSuccess: (result: { resumeId?: string }) => void
    ) => {
      setIsMutating(true);
      setActionError(null);

      try {
        const result = await task();
        if (result.ok) {
          onSuccess(result);
        } else {
          setActionError(result.error ?? "Action failed");
        }
      } catch (error) {
        console.error("Dashboard mutation failed:", error);
        setActionError("Action failed");
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const createResume = useCallback(
    async (name: string) => {
      await runMutation(() => createResumeAction(name), (result) => {
        if (result.resumeId) {
          openResume(result.resumeId);
        }
      });
    },
    [openResume, runMutation]
  );

  const createSubResume = useCallback(
    async (parentId: string, name: string) => {
      await runMutation(() => createSubResumeAction(parentId, name), (result) => {
        if (result.resumeId) {
          openResume(result.resumeId);
        }
      });
    },
    [openResume, runMutation]
  );

  const duplicateResume = useCallback(
    async (id: string) => {
      await runMutation(() => duplicateResumeAction(id), () => {
        refresh();
      });
    },
    [refresh, runMutation]
  );

  const renameResume = useCallback(
    async (id: string, newTitle: string) => {
      await runMutation(() => renameResumeAction(id, newTitle), () => {
        refresh();
      });
    },
    [refresh, runMutation]
  );

  const deleteResume = useCallback(
    async (id: string) => {
      await runMutation(() => deleteResumeAction(id), () => {
        refresh();
      });
    },
    [refresh, runMutation]
  );

  return {
    isMutating,
    actionError,
    clearActionError: () => setActionError(null),
    createResume,
    createSubResume,
    duplicateResume,
    renameResume,
    deleteResume,
  };
}
