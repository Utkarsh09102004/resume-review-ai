import { FileText, Plus } from "lucide-react";
import NewResumeButton from "./NewResumeButton";

interface EmptyStateProps {
  onCreate: () => void;
}

export default function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex min-h-[20rem] items-center justify-center">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-dashed border-bg-border bg-bg-surface/70 px-6 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent-amber/40 to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-bg-border bg-bg-elevated shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <FileText size={30} className="text-text-secondary" />
        </div>

        <h2 className="mt-6 text-xl font-semibold text-text-primary">
          No resumes yet
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-text-secondary">
          Start with a base resume, then branch tailored versions for each role
          without losing the original. Your workspace is ready for the first
          draft.
        </p>

        <div className="mt-8 flex justify-center">
          <NewResumeButton
            onClick={onCreate}
            label="Create Resume"
            variant="primary"
          />
        </div>

        <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-text-secondary/80">
          <Plus size={12} />
          Base resume first, tailored versions second
        </p>
      </div>
    </div>
  );
}
