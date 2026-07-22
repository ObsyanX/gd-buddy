// Runtime dependency-version evidence.
//
// Reads the resolved version of security-critical transitive packages and
// exposes them in a shape both the browser bundle and Supabase edge functions
// can log. Consumed by:
//   - src/lib/rum.ts (client bootstrap, prints once to console + posts to
//     an admin telemetry event)
//   - supabase/functions/dep-versions/index.ts (edge-side endpoint used by
//     the security report page)
//
// Keep this file free of DOM/Deno APIs so it imports cleanly from both.

// Static import: Vite/Rollup will tree-shake the unused surface and inline
// the version string. Using `?.version` guards against unexpected shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as protobuf from "protobufjs/minimal.js";

// Advisory GHSA-xq3m-2v4x-88gg is fixed in 7.5.3.
const PROTOBUFJS_FIX_VERSION = "7.5.3";

export interface DependencyEvidence {
  package: string;
  resolved: string;
  fix_version: string;
  patched: boolean;
}

function cmpSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

export function getProtobufjsEvidence(): DependencyEvidence {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolved = ((protobuf as any).VERSION as string | undefined) ?? "unknown";
  const patched = resolved !== "unknown" && cmpSemver(resolved, PROTOBUFJS_FIX_VERSION) >= 0;
  return {
    package: "protobufjs",
    resolved,
    fix_version: PROTOBUFJS_FIX_VERSION,
    patched,
  };
}

export function collectDependencyEvidence(): DependencyEvidence[] {
  return [getProtobufjsEvidence()];
}
