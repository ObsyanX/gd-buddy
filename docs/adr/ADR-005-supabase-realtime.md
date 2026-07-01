# ADR-005 · Supabase Realtime for Multiplayer

**Status:** Accepted

## Problem
GD sessions need <500 ms fan-out of messages, presence, and turn changes.

## Decision
Adopt Supabase Realtime (Postgres logical replication + presence channels).
Client dedup via message ids; server-side sequence via `event_log.seq`.

## Consequences
- Zero server to run; scales with Supabase.
- Requires strict RLS to prevent cross-session leakage.
