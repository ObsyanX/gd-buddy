import { useEffect, useRef, useState } from "react";

interface Options<T> {
  value: T;
  delay?: number;
  enabled?: boolean;
  onSave: (v: T) => Promise<void> | void;
}

export function useAutosave<T>({ value, delay = 30000, enabled = true, onSave }: Options<T>) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const firstRun = useRef(true);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (!enabled) return;
    const t = setTimeout(async () => {
      try {
        setStatus("saving");
        await onSave(latest.current);
        setStatus("saved");
        setSavedAt(new Date());
      } catch {
        setStatus("error");
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delay]);

  return { status, savedAt };
}
