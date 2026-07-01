# ADR-001 · Multi-Agent AI Architecture

**Status:** Accepted

## Problem
A single monolithic prompt cannot handle moderation, reasoning, fact-check,
memory, coaching, and scoring without severe context collision and cost blow-up.

## Decision
Split responsibilities across specialized edge functions: `reasoning-agent`,
`policy-engine`, `action-dispatcher`, `fact-checker`, `fallacy-detector`,
`emotion-analyzer`, `memory-indexer`, `graph-builder`, `coaching-engine`,
`completion-detector`. Each has its own model pin in `ai_models` and prompt
row in `prompts`.

## Alternatives
- Single "god prompt" (rejected: cost, hallucination, unauditable).
- LangChain-style dynamic tool use (rejected: latency, non-deterministic).

## Consequences
- Deterministic behavior per agent; easier eval per subsystem.
- Slightly higher orchestration cost — mitigated via calibration + `recommendation` mode.
