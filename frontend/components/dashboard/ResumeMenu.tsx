"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

interface ResumeMenuProps {
  isMain: boolean;
  onAction: (action: string) => void;
}

const MAIN_ITEMS = [
  { label: "Edit", action: "edit" },
  { label: "Rename", action: "rename" },
  { label: "Duplicate", action: "duplicate" },
  { label: "Create Sub-Resume", action: "create-sub" },
] as const;

const SUB_ITEMS = [
  { label: "Edit", action: "edit" },
  { label: "Rename", action: "rename" },
  { label: "Duplicate", action: "duplicate" },
] as const;

export default function ResumeMenu({ isMain, onAction }: ResumeMenuProps) {
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

  const items = isMain ? MAIN_ITEMS : SUB_ITEMS;

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
              key={item.action}
              type="button"
              role="menuitem"
              onClick={() => {
                onAction(item.action);
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-bg-surface cursor-pointer"
            >
              {item.label}
            </button>
          ))}

          <div className="my-1 h-px bg-bg-border" role="separator" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onAction("delete");
              setOpen(false);
            }}
            className="flex w-full items-center px-3 py-1.5 text-left text-sm text-status-error transition-colors hover:bg-status-error/10 cursor-pointer"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
