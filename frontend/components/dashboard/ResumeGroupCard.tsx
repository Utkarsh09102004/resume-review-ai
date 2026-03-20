"use client";

import { Pencil, Plus, Square } from "lucide-react";
import ResumeMenu from "./ResumeMenu";
import SubResumeRow from "./SubResumeRow";

interface SubResume {
  id: string;
  title: string;
  updatedAt: string;
}

interface ResumeGroup {
  id: string;
  title: string;
  updatedAt: string;
  subResumes: SubResume[];
}

interface ResumeGroupCardProps {
  resume: ResumeGroup;
  onEdit: (id: string) => void;
  onMenuAction: (id: string, action: string) => void;
  onNewSubResume: (parentId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResumeGroupCard({
  resume,
  onEdit,
  onMenuAction,
  onNewSubResume,
}: ResumeGroupCardProps) {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface p-5 transition-shadow hover:shadow-lg hover:shadow-black/20">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-amber/15 shrink-0">
          <Square size={14} className="text-accent-amber" fill="currentColor" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {resume.title}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {formatDate(resume.updatedAt)}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(resume.id)}
            className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-accent-amber cursor-pointer"
            aria-label={`Edit ${resume.title}`}
          >
            <Pencil size={12} />
            Edit
          </button>
          <ResumeMenu
            isMain={true}
            onAction={(action) => onMenuAction(resume.id, action)}
          />
        </div>
      </div>

      {/* Sub-resumes */}
      {resume.subResumes.length > 0 ? (
        <div className="mt-3 ml-4 border-l border-transparent">
          {resume.subResumes.map((sub, idx) => (
            <SubResumeRow
              key={sub.id}
              resume={sub}
              isLast={idx === resume.subResumes.length - 1}
              onEdit={onEdit}
              onMenuAction={onMenuAction}
            />
          ))}
        </div>
      ) : null}

      {/* New sub-resume button */}
      <button
        type="button"
        onClick={() => onNewSubResume(resume.id)}
        className="mt-3 ml-4 flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-accent-amber cursor-pointer"
      >
        <Plus size={14} />
        New Sub-Resume
      </button>
    </div>
  );
}
