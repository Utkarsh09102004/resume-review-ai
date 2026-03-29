import { Pencil, Plus, Square } from "lucide-react";
import type { ResumeGroup } from "@/lib/resumes";
import ResumeMenu from "./ResumeMenu";
import SubResumeRow from "./SubResumeRow";
import InlineRename from "./InlineRename";

interface ResumeGroupCardProps {
  resume: ResumeGroup;
  onEdit: (id: string) => void;
  onMenuAction: (id: string, action: string) => void;
  onNewSubResume: (parentId: string) => void;
  renamingId?: string | null;
  onRename?: (id: string, newTitle: string) => void;
  onCancelRename?: () => void;
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
  renamingId,
  onRename,
  onCancelRename,
}: ResumeGroupCardProps) {
  const isRenaming = renamingId === resume.id;

  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface p-5 transition-shadow hover:shadow-lg hover:shadow-black/20">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-amber/15 shrink-0">
          <Square size={14} className="text-accent-amber" fill="currentColor" />
        </div>

        <div className="flex-1 min-w-0">
          {isRenaming && onRename && onCancelRename ? (
            <InlineRename
              value={resume.title}
              onSave={(newTitle) => onRename(resume.id, newTitle)}
              onCancel={onCancelRename}
            />
          ) : (
            <>
              <h3
                className="group/title inline-flex items-center gap-1 text-sm font-semibold text-text-primary truncate cursor-text hover:border-b hover:border-dashed hover:border-text-secondary/50"
                onDoubleClick={() => onMenuAction(resume.id, "rename")}
                title="Double-click to rename"
              >
                <span className="truncate">{resume.title}</span>
                <Pencil
                  size={10}
                  className="opacity-0 group-hover/title:opacity-50 text-text-secondary shrink-0 transition-opacity"
                />
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {formatDate(resume.updatedAt)}
              </p>
            </>
          )}
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
              isRenaming={renamingId === sub.id}
              onRename={onRename}
              onCancelRename={onCancelRename}
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
