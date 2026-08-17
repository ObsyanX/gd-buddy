// Minimal ambient declaration so edge-function modules under supabase/functions
// can be imported into vitest specs without pulling in Deno's full type set.
declare global {
  const Deno: {
    env: { get(key: string): string | undefined };
  };
}

export {};
