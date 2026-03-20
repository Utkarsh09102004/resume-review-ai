import { FileText, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreate: () => void;
}

export default function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-bg-border px-12 py-14 text-center max-w-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg-elevated">
          <FileText size={28} className="text-text-secondary" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-text-primary">
          No resumes yet
        </h2>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          Create your first resume to get started. You can build multiple
          versions and tailor each one for different roles.
        </p>

        <button
          type="button"
          onClick={onCreate}
          className="mt-6 flex items-center gap-2 rounded-lg bg-accent-amber px-5 py-2.5 text-sm font-semibold text-bg-deep transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
        >
          <Plus size={16} />
          Create Resume
        </button>
      </div>
    </div>
  );
}
