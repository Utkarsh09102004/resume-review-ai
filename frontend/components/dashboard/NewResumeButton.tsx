import { Plus } from "lucide-react";

interface NewResumeButtonProps {
  onClick: () => void;
  label?: string;
  variant?: "secondary" | "primary";
  fullWidth?: boolean;
}

export default function NewResumeButton({
  onClick,
  label = "New Resume",
  variant = "secondary",
  fullWidth = false,
}: NewResumeButtonProps) {
  const baseClasses =
    "flex items-center justify-center gap-2 rounded-xl text-sm transition-all cursor-pointer";
  const sizeClasses = variant === "primary" ? "px-5 py-3 font-semibold" : "px-4 py-2 font-medium";
  const toneClasses =
    variant === "primary"
      ? "bg-accent-amber text-bg-deep hover:brightness-110 active:scale-[0.99]"
      : "border border-bg-border text-text-secondary hover:border-accent-amber hover:text-accent-amber";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        baseClasses,
        sizeClasses,
        toneClasses,
        fullWidth ? "w-full" : "",
      ].join(" ")}
    >
      <Plus size={16} />
      {label}
    </button>
  );
}
