"use client";

import { FileText, Pencil } from "lucide-react";
import TreeConnector from "./TreeConnector";
import ResumeMenu from "./ResumeMenu";

interface SubResume {
  id: string;
  title: string;
  updatedAt: string;
}

interface SubResumeRowProps {
  resume: SubResume;
  isLast: boolean;
  onEdit: (id: string) => void;
  onMenuAction: (id: string, action: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubResumeRow({
  resume,
  isLast,
  onEdit,
  onMenuAction,
}: SubResumeRowProps) {
  return (
    <div className="flex items-center group transition-colors hover:bg-bg-elevated rounded-md -mx-2 px-2">
      <TreeConnector isLast={isLast} />

      <div className="flex flex-1 items-center gap-3 py-2 min-w-0">
        <FileText size={16} className="text-text-secondary shrink-0" />
        <span className="text-sm text-text-primary truncate">
          {resume.title}
        </span>
        <span className="text-xs text-text-secondary whitespace-nowrap ml-auto mr-2">
          {formatDate(resume.updatedAt)}
        </span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={() => onEdit(resume.id)}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-text-secondary transition-colors hover:bg-bg-surface hover:text-accent-amber cursor-pointer"
          aria-label={`Edit ${resume.title}`}
        >
          <Pencil size={12} />
          Edit
        </button>
        <ResumeMenu
          isMain={false}
          onAction={(action) => onMenuAction(resume.id, action)}
        />
      </div>
    </div>
  );
}
