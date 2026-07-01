# ADR-003 · Explicit Reasoning Layer

**Status:** Accepted

## Problem
Policy rules alone lack context (silence semantics, novelty, emotion).

## Decision
Introduce `reasoning-agent` that ingests detectors (silence, emotion, transcript,
graph) and emits structured hypotheses + confidence. Feed into Policy Engine.

## Consequences
- Clean separation: reasoning explains *why*, policy decides *what*.
- Enables explainability UI (Intelligence dashboard).
