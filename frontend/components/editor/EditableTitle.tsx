"use client";

import { useEffect, useRef, useState } from "react";

interface EditableTitleProps {
  value: string;
  onSave: (newTitle: string) => void;
}

export default function EditableTitle({ value, onSave }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function startEditing() {
    savedRef.current = false;
    setText(value);
    setIsEditing(true);
  }

  function handleSave() {
    if (savedRef.current) return;
    const trimmed = text.trim();
    if (trimmed.length > 0 && trimmed !== value) {
      savedRef.current = true;
      onSave(trimmed);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setText(value);
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        maxLength={255}
        className="bg-transparent border-b-2 border-accent-amber px-0 py-0.5 text-xs text-text-primary outline-none min-w-[80px] max-w-[200px]"
        aria-label="Resume title"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="text-xs text-text-secondary truncate cursor-text hover:text-text-primary hover:border-b hover:border-accent-amber/40 transition-colors max-w-[200px]"
      title="Click to rename"
      aria-label="Click to rename resume"
    >
      {value}
    </button>
  );
}
