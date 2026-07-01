# ADR-002 · Deterministic Policy Engine

**Status:** Accepted

## Problem
AI moderators drift and cannot be audited if every action is a free-form LLM output.

## Decision
All moderator interventions must pass through a rules-first `policy-engine`
that consumes reasoning-agent output and emits a typed action + confidence.
LLM reasoning is advisory; the policy engine is authoritative.

## Consequences
- Every intervention is reproducible and reviewable.
- Overrides route through `overrides` table for benchmarking (ADR-006).
