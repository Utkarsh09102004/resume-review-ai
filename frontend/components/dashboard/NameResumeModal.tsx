"use client";

import { useEffect, useRef, useState } from "react";

interface NameResumeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  title: string;
  defaultName: string;
  isPending?: boolean;
}

export default function NameResumeModal({
  open,
  onClose,
  onConfirm,
  title,
  defaultName,
  isPending = false,
}: NameResumeModalProps) {
  const [name, setName] = useState(defaultName);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      // Wait a tick for the dialog to render, then focus + select
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const trimmed = name.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= 255;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isValid) {
      onConfirm(trimmed);
    }
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent p-0 backdrop:bg-transparent"
      onClose={onClose}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-bg-deep/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-xl border border-bg-border bg-bg-surface p-6 shadow-2xl animate-[modalIn_200ms_ease-out]"
          role="document"
        >
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>

          <form onSubmit={handleSubmit} className="mt-4">
            <label htmlFor="resume-name" className="sr-only">
              Resume name
            </label>
            <input
              ref={inputRef}
              id="resume-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              placeholder="Enter a name..."
              className="w-full rounded-lg border border-bg-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none transition-colors focus:border-accent-amber focus:ring-1 focus:ring-accent-amber"
              aria-label="Resume name"
            />

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg border border-bg-border bg-bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || isPending}
                className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                {isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
