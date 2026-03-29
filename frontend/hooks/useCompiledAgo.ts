"use client";

import { useEffect, useState } from "react";

function formatCompiledAgo(compiledAt: number, now: number) {
  const seconds = Math.round((now - compiledAt) / 1000);
  if (seconds < 5) {
    return "just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  return `${Math.floor(seconds / 60)}m ago`;
}

export function useCompiledAgo(compiledAt: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (compiledAt === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [compiledAt]);

  if (compiledAt === null) {
    return "";
  }

  return formatCompiledAgo(compiledAt, Math.max(now, compiledAt));
}
