# ADR-006 · Event Sourcing for Sessions

**Status:** Accepted

## Problem
Replay, benchmarking, and audit all need a single source of truth.

## Decision
Append-only `event_log` records every material decision (`policy.triggered`,
`safety.blocked`, `override.applied`, phase transitions, mic grants, etc.).
Session replay is reconstructed by folding events; scores frozen with
`subsystem_versions` snapshot.

## Consequences
- Deterministic replay + governance audit.
- Storage grows linearly; retention policy configurable per org.
