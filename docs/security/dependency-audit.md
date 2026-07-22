# Dependency Security Audit — Verification Report

_Last verified: 2026-07-22_

## 1. Re-scan summary

A fresh security scan was executed via `security--run_security_scan` and a
lockfile audit via `code--dependency_scan` (equivalent to `bun audit`).

| Scanner                         | Result                                         |
| ------------------------------- | ---------------------------------------------- |
| Lovable dependency scan          | **No high or critical vulnerabilities**        |
| Lovable app security scan (22)   | 0 supply-chain findings; remaining items are Supabase DB linter warnings (`SECURITY DEFINER` execute grants, non-critical) |
| `vulnerable_dependencies_critical` | **Cleared** — not present in re-scan results |

## 2. `vulnerable_dependencies_critical` — root cause & fix

The previous critical was raised against **`protobufjs`** (CVE prototype-pollution
class, fix in `>=7.5.3`). It is not a direct dependency of this project; it
only enters the tree transitively via:

```
@huggingface/transformers → onnxruntime-web → protobufjs
```

### Evidence — resolved version in `bun.lock`

```text
"protobufjs": ["protobufjs@7.5.4", ..., "sha512-CvexbZtbov6jW2eXAvLukXjXUW1TzFaivC46BpWc/3BpcCysb5Vffu+B3XHMm8lVEuy2Mm4XGex8hBSg1yapPg=="]
```

`7.5.4 >= 7.5.3` → the installed version is above the advisory fix threshold on
every install produced from this lockfile.

### Client bundle (Vite / React)

`protobufjs` is only reachable at runtime from the browser bundle through
`onnxruntime-web` (used by `@huggingface/transformers` for local Whisper STT).
Vite installs from the same `bun.lock`, so the shipped bundle resolves the same
`protobufjs@7.5.4`.

### Edge functions (Supabase / Deno)

```bash
$ grep -rn "protobufjs" supabase/functions/
(no results)
```

Edge functions do **not** import `protobufjs` directly or transitively — they
run on Deno with `npm:@supabase/*` and `npm:@huggingface/inference` (server
API, no ONNX runtime). There is no server-side surface exposed to the
prototype-pollution vector.

### Server / SSR

The project has no separate Node/SSR server. Vercel serves the pre-built
static SPA plus Supabase Edge Functions, both covered above.

## 3. Automated CI dependency scanning

Added `.github/workflows/dependency-scan.yml`:

- Runs `bun audit --json` on every push, pull request, daily cron, and manual
  dispatch.
- **Fails the build only** when at least one **high** or **critical** advisory
  matches an installed version — matching the Lovable scanner's fix thresholds.
- Uploads `audit.json` as a workflow artifact (30-day retention) for review.
- Complements `dependabot.yml`, which already opens PRs for security updates
  the moment an advisory is published.

## 4. Reproduce locally

```bash
bun install --frozen-lockfile
bun audit                       # human-readable
bun audit --json | jq '[.advisories // {} | to_entries[] | select(.value.severity == "high" or .value.severity == "critical")] | length'
grep -n '"protobufjs":' bun.lock  # expect 7.5.4 or higher
```

If the last `jq` invocation prints `0`, no high/critical vulnerable
dependencies are installed and the CI job passes.
