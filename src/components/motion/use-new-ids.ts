"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ids that appeared since the previous render (never on first render).
 * Used to highlight a game that a live update just added.
 */
export function useNewIds(ids: readonly string[]): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const key = ids.join("|");

  useEffect(() => {
    const current = key ? key.split("|") : [];
    const prev = seen.current;
    seen.current = new Set(current);
    if (!prev) return;
    const added = current.filter((id) => !prev.has(id));
    if (added.length) setFresh(new Set(added));
  }, [key]);

  return fresh;
}
