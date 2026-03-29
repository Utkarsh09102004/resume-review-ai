"use client";

import { useEffect, useRef, useState } from "react";

interface InlineRenameProps {
  value: string;
  onSave: (newTitle: string) => void;
  onCancel: () => void;
}

export default function InlineRename({
  value,
  onSave,
  onCancel,
}: InlineRenameProps) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = text.trim();
      if (trimmed.length > 0) {
        savedRef.current = true;
        onSave(trimmed);
      } else {
        onCancel();
      }
    } else if (e.key === "Escape") {
      onCancel();
    }
  }

  function handleBlur() {
    if (savedRef.current) return;
    const trimmed = text.trim();
    if (trimmed.length > 0 && trimmed !== value) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-full bg-transparent border-b-2 border-accent-amber px-0 py-0.5 text-sm font-semibold text-text-primary outline-none"
      aria-label="Rename"
    />
  );
}
