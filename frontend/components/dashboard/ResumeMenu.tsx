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
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary cursor-pointer"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-bg-border bg-bg-elevated py-1 shadow-xl animate-[fadeIn_150ms_ease-out]"
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
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-bg-surface cursor-pointer ${
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
  onEdit: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onCreateSubResume: () => void;
  onDelete: () => void;
}

export function MainResumeMenu({
  onEdit,
  onRename,
  onDuplicate,
  onCreateSubResume,
  onDelete,
}: MainResumeMenuProps) {
  return (
    <ResumeMenu
      items={[
        { label: "Edit", onSelect: onEdit },
        { label: "Rename", onSelect: onRename },
        { label: "Duplicate", onSelect: onDuplicate },
        { label: "Create Sub-Resume", onSelect: onCreateSubResume },
        { label: "Delete", onSelect: onDelete, tone: "danger" },
      ]}
    />
  );
}

interface SubResumeMenuProps {
  onEdit: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SubResumeMenu({
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
}: SubResumeMenuProps) {
  return (
    <ResumeMenu
      items={[
        { label: "Edit", onSelect: onEdit },
        { label: "Rename", onSelect: onRename },
        { label: "Duplicate", onSelect: onDuplicate },
        { label: "Delete", onSelect: onDelete, tone: "danger" },
      ]}
    />
  );
}
