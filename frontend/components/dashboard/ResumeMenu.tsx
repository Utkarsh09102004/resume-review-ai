"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

interface ResumeMenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
}

interface SharedResumeMenuProps {
  items: ResumeMenuItem[];
}

function ResumeMenu({ items }: SharedResumeMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-bg-border/70 bg-bg-elevated/55 text-text-secondary transition-colors hover:border-accent-amber/25 hover:text-text-primary cursor-pointer"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-bg-border/80 bg-bg-surface/95 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-bg-elevated/80 cursor-pointer ${
                item.tone === "danger" ? "text-status-error" : "text-text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface MainResumeMenuProps {
  onDelete: () => void;
}

export function MainResumeMenu({ onDelete }: MainResumeMenuProps) {
  return (
    <ResumeMenu
      items={[
        { label: "Delete", onSelect: onDelete, tone: "danger" },
      ]}
    />
  );
}

interface SubResumeMenuProps {
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SubResumeMenu({ onDuplicate, onDelete }: SubResumeMenuProps) {
  return (
    <ResumeMenu
      items={[
        { label: "Duplicate", onSelect: onDuplicate },
        { label: "Delete", onSelect: onDelete, tone: "danger" },
      ]}
    />
  );
}
