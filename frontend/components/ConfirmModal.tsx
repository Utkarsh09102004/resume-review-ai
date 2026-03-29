"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      cancelRef.current?.focus();
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
          <h2 className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {message}
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              className="rounded-lg border border-bg-border bg-bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-surface cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-status-error px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-status-error/80 cursor-pointer"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
