"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import ResumeGroupCard from "@/components/dashboard/ResumeGroupCard";
import EmptyState from "@/components/dashboard/EmptyState";
import NewResumeButton from "@/components/dashboard/NewResumeButton";
import ConfirmModal from "@/components/ConfirmModal";
import NameResumeModal from "@/components/dashboard/NameResumeModal";
import { useDashboardMutations } from "@/hooks/useDashboardMutations";
import {
  generateDefaultTitle,
  generateSubResumeTitle,
} from "@/lib/resumeDefaults";
import type { UserDisplayInfo } from "@/lib/auth";
import type { ResumeGroup } from "@/lib/resumes";

function findResumeTarget(resumes: ResumeGroup[], id: string) {
  const parentResume = resumes.find(
    (resume) => resume.id === id || resume.subResumes.some((subResume) => subResume.id === id)
  );

  if (!parentResume) {
    return null;
  }

  return parentResume.id === id
    ? { id: parentResume.id, title: parentResume.title }
    : parentResume.subResumes.find((subResume) => subResume.id === id) ?? null;
}

export default function DashboardPageClient({
  user,
  resumes,
  initialError,
}: {
  user: UserDisplayInfo;
  resumes: ResumeGroup[];
  initialError: string | null;
}) {
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    title: string;
  }>({ open: false, id: "", title: "" });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nameModal, setNameModal] = useState<{
    open: boolean;
    parentId: string | null;
    defaultName: string;
  }>({ open: false, parentId: null, defaultName: "" });
  const {
    isMutating,
    actionError,
    clearActionError,
    createResume,
    createSubResume,
    duplicateResume,
    renameResume,
    deleteResume,
  } = useDashboardMutations({
    openResume: (resumeId) => router.push(`/editor/${resumeId}`),
    refresh: () => router.refresh(),
  });
  const error = actionError ?? initialError;

  function handleEdit(id: string) {
    router.push(`/editor/${id}`);
  }

  async function handleDuplicate(id: string) {
    if (isMutating) return;
    await duplicateResume(id);
  }

  function handleRequestDelete(id: string) {
    const target = findResumeTarget(resumes, id);
    if (!target) {
      return;
    }

    setDeleteModal({ open: true, id, title: target.title });
  }

  function handleRequestRename(id: string) {
    setRenamingId(id);
  }

  function handleCreateSubResume(parentId: string) {
    const parent = resumes.find((r) => r.id === parentId);
    const defaultName = parent
      ? generateSubResumeTitle(parent.title, parent.subResumes.length)
      : "Untitled Sub-Resume";
    setNameModal({ open: true, parentId, defaultName });
  }

  function handleNewResume() {
    const defaultName = generateDefaultTitle(resumes.map((r) => r.title));
    setNameModal({ open: true, parentId: null, defaultName });
  }

  async function handleNameModalConfirm(name: string) {
    if (isMutating) return;

    const parentId = nameModal.parentId;
    setNameModal({ open: false, parentId: null, defaultName: "" });

    if (parentId) {
      await createSubResume(parentId, name);
    } else {
      await createResume(name);
    }
  }

  async function handleDeleteConfirm() {
    if (isMutating) return;

    const id = deleteModal.id;
    setDeleteModal({ open: false, id: "", title: "" });
    await deleteResume(id);
  }

  async function handleRename(id: string, newTitle: string) {
    if (isMutating) return;

    await renameResume(id, newTitle);
    setRenamingId(null);
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        user={user}
        actions={<NewResumeButton onClick={handleNewResume} />}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary">
              My Resumes
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage your resumes and tailored versions
            </p>
          </div>

          {error ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-status-error">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    clearActionError();
                    router.refresh();
                  }}
                  className="cursor-pointer text-sm text-accent-amber hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : resumes.length === 0 ? (
            <EmptyState onCreate={handleNewResume} />
          ) : (
            <div className="flex flex-col gap-4">
              {resumes.map((resume) => (
                <ResumeGroupCard
                  key={resume.id}
                  resume={resume}
                  onEdit={handleEdit}
                  onRequestRename={handleRequestRename}
                  onDuplicate={handleDuplicate}
                  onCreateSubResume={handleCreateSubResume}
                  onRequestDelete={handleRequestDelete}
                  renamingId={renamingId}
                  onRename={handleRename}
                  onCancelRename={() => setRenamingId(null)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: "", title: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete Resume"
        message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
        isPending={isMutating}
      />

      <NameResumeModal
        open={nameModal.open}
        onClose={() =>
          setNameModal({ open: false, parentId: null, defaultName: "" })
        }
        onConfirm={handleNameModalConfirm}
        title={
          nameModal.parentId ? "Name Your Sub-Resume" : "Name Your Resume"
        }
        defaultName={nameModal.defaultName}
        isPending={isMutating}
      />
    </div>
  );
}
