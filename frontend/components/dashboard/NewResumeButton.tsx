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
    "dashboard-button cursor-pointer text-sm";
  const sizeClasses = variant === "primary" ? "px-5 py-3.5 font-semibold" : "px-4 py-2.5 font-medium";
  const toneClasses =
    variant === "primary"
      ? "dashboard-button--primary"
      : "dashboard-button--secondary";

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
