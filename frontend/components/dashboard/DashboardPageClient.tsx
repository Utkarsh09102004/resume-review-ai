"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import ResumeGroupCard from "@/components/dashboard/ResumeGroupCard";
import EmptyState from "@/components/dashboard/EmptyState";
import NewResumeButton from "@/components/dashboard/NewResumeButton";
import ConfirmModal from "@/components/ConfirmModal";
import NameResumeModal from "@/components/dashboard/NameResumeModal";
import { useResumes } from "@/hooks/useResumes";
import {
  generateDefaultTitle,
  generateSubResumeTitle,
} from "@/lib/resumeDefaults";
import type { UserDisplayInfo } from "@/lib/auth";

export default function DashboardPageClient({
  user,
}: {
  user: UserDisplayInfo;
}) {
  const router = useRouter();
  const {
    resumes,
    loading,
    error,
    createResume,
    createSubResume,
    renameResume,
    duplicateResume,
    deleteResume,
  } = useResumes();

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    title: string;
  }>({ open: false, id: "", title: "" });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [nameModal, setNameModal] = useState<{
    open: boolean;
    parentId: string | null;
    defaultName: string;
  }>({ open: false, parentId: null, defaultName: "" });

  function handleEdit(id: string) {
    router.push(`/editor/${id}`);
  }

  async function handleMenuAction(id: string, action: string) {
    if (action === "edit") {
      router.push(`/editor/${id}`);
      return;
    }

    if (action === "delete") {
      const resume = resumes.find(
        (r) => r.id === id || r.subResumes.some((s) => s.id === id)
      );
      const target =
        resume?.id === id
          ? resume
          : resume?.subResumes.find((s) => s.id === id);
      if (target) {
        setDeleteModal({ open: true, id, title: target.title });
      }
      return;
    }

    if (action === "rename") {
      setRenamingId(id);
      return;
    }

    if (action === "duplicate") {
      try {
        await duplicateResume(id);
      } catch (err) {
        console.error("Duplicate failed:", err);
      }
      return;
    }

    if (action === "create-sub") {
      const parent = resumes.find((r) => r.id === id);
      const defaultName = parent
        ? generateSubResumeTitle(parent.title, parent.subResumes.length)
        : "Untitled Sub-Resume";
      setNameModal({ open: true, parentId: id, defaultName });
    }
  }

  function handleNewSubResume(parentId: string) {
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
    if (isCreating) return;

    try {
      setIsCreating(true);
      setNameModal({ open: false, parentId: null, defaultName: "" });
      const newId = nameModal.parentId
        ? await createSubResume(nameModal.parentId, name)
        : await createResume(name);
      router.push(`/editor/${newId}`);
    } catch (err) {
      console.error("Create resume failed:", err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteConfirm() {
    try {
      await deleteResume(deleteModal.id);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleteModal({ open: false, id: "", title: "" });
    }
  }

  async function handleRename(id: string, newTitle: string) {
    try {
      await renameResume(id, newTitle);
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setRenamingId(null);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar user={user} actions={<NewResumeButton onClick={handleNewResume} />} />

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

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-bg-border border-t-accent-amber" />
                <p className="text-sm text-text-secondary">
                  Loading resumes...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-status-error">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
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
                  onMenuAction={handleMenuAction}
                  onNewSubResume={handleNewSubResume}
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
      />
    </div>
  );
}
