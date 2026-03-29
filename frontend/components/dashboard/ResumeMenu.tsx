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
        className="dashboard-icon-button h-9 w-9 cursor-pointer"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          className="dashboard-menu-panel absolute right-0 top-full z-50 mt-2 w-44 p-1.5"
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
              className={`dashboard-menu-item flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm ${
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
