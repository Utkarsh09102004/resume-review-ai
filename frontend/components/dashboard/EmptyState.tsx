import { FileText, Plus } from "lucide-react";
import NewResumeButton from "./NewResumeButton";

interface EmptyStateProps {
  onCreate: () => void;
}

export default function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex min-h-[20rem] items-center justify-center">
      <div className="dashboard-panel dashboard-panel--strong w-full max-w-2xl px-6 py-12 text-center sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent-amber/40 to-transparent"
          aria-hidden="true"
        />

        <div className="dashboard-icon-chip mx-auto h-16 w-16">
          <FileText size={30} className="text-accent-amber" />
        </div>

        <h2 className="mt-6 text-xl font-semibold text-text-primary">
          No resumes yet
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-text-secondary">
          Start with a base resume, then branch tailored versions for each role
          without losing the original. Your workspace is ready for the first
          draft.
        </p>

        <div className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-bg-border/80 bg-bg-elevated/55 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-secondary/80">
              Step 1
            </p>
            <p className="mt-2 text-sm font-medium text-text-primary">
              Draft a master resume
            </p>
          </div>
          <div className="rounded-2xl border border-bg-border/80 bg-bg-elevated/55 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-secondary/80">
              Step 2
            </p>
            <p className="mt-2 text-sm font-medium text-text-primary">
              Branch tailored versions
            </p>
          </div>
          <div className="rounded-2xl border border-bg-border/80 bg-bg-elevated/55 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-secondary/80">
              Step 3
            </p>
            <p className="mt-2 text-sm font-medium text-text-primary">
              Keep each opportunity separate
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <NewResumeButton
            onClick={onCreate}
            label="Create Resume"
            variant="primary"
          />
        </div>

        <p className="dashboard-chip mx-auto mt-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary/80">
          <Plus size={12} />
          Base resume first, tailored versions second
        </p>
      </div>
    </div>
  );
}
