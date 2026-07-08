import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<(v: unknown) => void>>();

export function useFeatureFlag<T = unknown>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(() => (cache.has(key) ? (cache.get(key) as T) : fallback));

  useEffect(() => {
    let cancelled = false;
    if (!listeners.has(key)) listeners.set(key, new Set());
    const set = listeners.get(key)!;
    const cb = (v: unknown) => { if (!cancelled) setValue((v as T) ?? fallback); };
    set.add(cb);

    if (!cache.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("get_feature_flag", { _key: key }).then(({ data }: { data: unknown }) => {
        cache.set(key, data);
        set.forEach((fn) => fn(data));
      }).catch(() => {
        cache.set(key, fallback);
      });
    } else {
      cb(cache.get(key));
    }

    return () => { cancelled = true; set.delete(cb); };
  }, [key, fallback]);

  return value;
}

export function invalidateFeatureFlag(key: string) {
  cache.delete(key);
}
