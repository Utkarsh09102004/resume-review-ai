"use client";

import { useState } from "react";
import Toolbar from "@/components/Toolbar";
import ResumeGroupCard from "@/components/dashboard/ResumeGroupCard";
import EmptyState from "@/components/dashboard/EmptyState";
import NewResumeButton from "@/components/dashboard/NewResumeButton";
import ConfirmModal from "@/components/ConfirmModal";

// Mock data for development
const MOCK_RESUMES = [
  {
    id: "1",
    title: "Software Engineer \u2014 Master",
    updatedAt: "2026-03-19T00:00:00Z",
    subResumes: [
      { id: "2", title: "Frontend Focus", updatedAt: "2026-03-19T00:00:00Z" },
      { id: "3", title: "Backend + Infra", updatedAt: "2026-03-18T00:00:00Z" },
      { id: "4", title: "Startup (YC apps)", updatedAt: "2026-03-17T00:00:00Z" },
    ],
  },
  {
    id: "5",
    title: "Data Science Resume",
    updatedAt: "2026-03-15T00:00:00Z",
    subResumes: [],
  },
];

// Toggle this to see empty state: set to true
const SHOW_EMPTY_STATE = false;

export default function DashboardPage() {
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    title: string;
  }>({ open: false, id: "", title: "" });

  const resumes = SHOW_EMPTY_STATE ? [] : MOCK_RESUMES;

  function handleEdit(id: string) {
    // Will be wired to router.push(`/editor/${id}`)
    console.log("Edit:", id);
  }

  function handleMenuAction(id: string, action: string) {
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
    } else {
      console.log("Menu action:", action, "on", id);
    }
  }

  function handleNewSubResume(parentId: string) {
    console.log("New sub-resume for:", parentId);
  }

  function handleNewResume() {
    console.log("Create new resume");
  }

  function handleDeleteConfirm() {
    console.log("Delete confirmed:", deleteModal.id);
    setDeleteModal({ open: false, id: "", title: "" });
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        user={{ name: "Utkarsh Agarwal" }}
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

          {resumes.length === 0 ? (
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
    </div>
  );
}
