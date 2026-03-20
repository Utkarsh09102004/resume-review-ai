import { Plus } from "lucide-react";

interface NewResumeButtonProps {
  onClick: () => void;
}

export default function NewResumeButton({ onClick }: NewResumeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-bg-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent-amber hover:text-accent-amber cursor-pointer"
    >
      <Plus size={16} />
      New Resume
    </button>
  );
}
