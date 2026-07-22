# Dependency Security Audit — Verification Report

_Last verified: 2026-07-22_

## 1. Re-scan summary

| Scanner                              | Result                                             |
| ------------------------------------ | -------------------------------------------------- |
| `code--dependency_scan` (bun audit)  | **0 high/critical vulnerabilities**                |
| Fresh `security--run_security_scan`  | 0 supply-chain findings in the live re-scan output |
| Persisted `supply_chain` finding     | Still flags `@huggingface/transformers@4.2.0` as the parent package tagged by advisory GHSA-xq3m-2v4x-88gg. The actual vulnerable transitive `protobufjs` resolves to `7.5.4` (≥ fix threshold 7.5.3), so the exploit path is closed. `mark_as_fixed` is currently rejected by the persistent scanner because it still string-matches the parent package name, not the resolved transitive version. |

## 2. `vulnerable_dependencies_critical` — evidence trail

Advisory: [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) — prototype pollution in `protobufjs`, **fixed in `>=7.5.3`**.

Only transitive path in this project:

```
@huggingface/transformers@4.2.0
  └─ onnxruntime-web@1.26.0-dev...
       └─ protobufjs@7.5.4   ✅ patched
```

### Resolved-version proof (lockfile)

```text
$ grep '"protobufjs":' bun.lock
"protobufjs": ["protobufjs@7.5.4", ..., "sha512-CvexbZtbov6jW2eXAvLukXjXUW1TzFaivC46BpWc/3BpcCysb5Vffu+B3XHMm8lVEuy2Mm4XGex8hBSg1yapPg=="]
```

`7.5.4 ≥ 7.5.3` on every install produced from this lockfile.

### Client bundle (Vite / React SPA)

Vite installs from the same `bun.lock`, so the shipped bundle links `protobufjs@7.5.4`.

At runtime the browser prints machine-checkable evidence to the console on
first RUM tick, via `src/lib/security/dependency-evidence.ts`:

```
[security:deps] {"runtime":"browser","evidence":[{"package":"protobufjs","resolved":"7.5.4","fix_version":"7.5.3","patched":true}]}
```

Auditors can screenshot the console on the live site to capture proof.

### Edge functions (Supabase / Deno)

```bash
$ grep -rn "protobufjs" supabase/functions/
(no results)
```

Edge functions do not import `protobufjs` — the vector is unreachable server-side.
For belt-and-braces, `supabase/functions/dep-versions/index.ts` exposes an
authenticated endpoint that dynamically imports `npm:protobufjs@^7.5.4/minimal.js`
and returns the resolved `VERSION` plus a `patched` boolean, and mirrors the
result to edge-function logs:

```
[dep-versions] {"runtime":"deno-edge","dependencies":[{"package":"protobufjs","resolved":"7.5.4","patched":true,...}]}
```

### Server / SSR

None — Vercel serves the pre-built static SPA plus Supabase Edge Functions,
both covered above.

## 3. CI dependency scanning (`.github/workflows/dependency-scan.yml`)

- Runs `bun audit --json` on every push, PR, daily cron, and manual dispatch.
- **Fails the build only** on **high** or **critical** severity, matching the
  Lovable scanner's fix thresholds (avoids noise from unfixable moderate/low
  advisories).
- Uploads `audit.json` as a 30-day artifact.
- Pairs with `.github/dependabot.yml`, which auto-opens PRs the moment a new
  advisory is published against an installed package.

## 4. SBOM & provenance attestation (`.github/workflows/sbom-provenance.yml`)

Every push to `main` and every PR now produces:

- **CycloneDX 1.5 SBOM** (`artifacts/sbom.cdx.json`) generated with
  `@cyclonedx/cdxgen`. The job asserts `protobufjs` in the SBOM is `≥ 7.5.3`
  and fails the build otherwise.
- **Extracted evidence file** (`artifacts/sbom-protobufjs.txt`) — one line:
  `protobufjs@<version>`.
- **Lockfile provenance** (`artifacts/provenance.md` + `lockfile-hashes.txt`)
  containing SHA-256 hashes of `bun.lock` and `package.json`, the git SHA,
  and the Bun toolchain version.
- **GitHub build attestation** for `sbom.cdx.json` and `bun.lock` via
  `actions/attest-build-provenance@v2` — signed by the GitHub OIDC issuer,
  verifiable with `gh attestation verify`.
- Uploaded as the `sbom-and-provenance` workflow artifact (90-day retention).

### Verifying a build's provenance

```bash
# 1. Download the artifact from the GitHub Actions run.
gh run download <run-id> -n sbom-and-provenance -D ./audit

# 2. Verify the SBOM was produced by this repo's workflow.
gh attestation verify ./audit/sbom.cdx.json \
  --repo <owner>/<repo>

# 3. Compare lockfile hashes to what shipped.
sha256sum bun.lock package.json
diff - ./audit/lockfile-hashes.txt <<< "$(sha256sum bun.lock package.json)"

# 4. Assert the SBOM's protobufjs version.
jq -r '.components[] | select(.name == "protobufjs") | .version' ./audit/sbom.cdx.json
# → 7.5.4 (or higher)
```

## 5. Runtime evidence endpoints

| Runtime  | Source                                             | Output shape                                                                 |
| -------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Browser  | `src/lib/security/dependency-evidence.ts`, invoked by `startRUM()` | `console.info("[security:deps]", ...)` on first metric flush |
| Deno edge | `supabase/functions/dep-versions/index.ts` (auth-gated) | HTTP 200 JSON `{ runtime, dependencies: [{ package, resolved, fix_version, patched }] }` |

Both paths compute `patched` by comparing the resolved version against
`fix_version = 7.5.3` using a shared 3-part semver comparator so the evidence
stays consistent across surfaces.

## 6. Remaining scanner findings (non-supply-chain)

Fresh `security--run_security_scan` returned 22 findings, all at severity
`warn`:

- **20 × `SECURITY DEFINER` execute-grant warnings** on `public.has_role`,
  `can_access_session`, `owns_session`, `is_joinable_session`,
  `get_feature_flag`, `related_articles`, `increment_article_*`,
  `request_mic`, `release_mic`, `export_user_data`, `delete_user_data`.
  These functions are intentionally callable — they're referenced from RLS
  policies (`has_role`, `can_access_session`, `owns_session`) or from
  authenticated/anonymous client flows (article counters, feature flags,
  join lobby, GDPR export/delete, mic queue). Revoking `EXECUTE` would
  break RLS evaluation and product features, so the warnings are accepted
  as documented defense-in-depth cost.
- **1 × `PUBLIC_USER_DATA`** on `profiles` "Admins can view all profiles"
  policy — **fixed** by migration `20260722_restrict_profiles_admin_policy_to_authenticated`,
  which recreates the policy scoped to `TO authenticated`.
- **1 × `MISSING_OWNERSHIP_CHECK`** on the public `avatars` bucket read
  path — intentional (avatars are public assets); scanner notes "no action
  needed if only avatars are stored".

## 7. Reproduce locally

```bash
bun install --frozen-lockfile
bun audit                                # human-readable
bun audit --json | jq '[.advisories // {} | to_entries[] | select(.value.severity == "high" or .value.severity == "critical")] | length'

# SBOM
npx -y @cyclonedx/cdxgen@^11 -t js -o /tmp/sbom.cdx.json .
jq -r '.components[] | select(.name == "protobufjs") | "\(.name)@\(.version)"' /tmp/sbom.cdx.json

# Provenance
sha256sum bun.lock package.json

# Edge runtime evidence
curl -H "Authorization: Bearer <user-jwt>" \
  https://<project-ref>.functions.supabase.co/dep-versions
```
