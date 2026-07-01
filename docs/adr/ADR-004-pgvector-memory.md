# ADR-004 · pgvector Conversation Memory

**Status:** Accepted

## Problem
Detecting duplicate ideas and semantic drift needs cheap similarity search.

## Decision
Use Postgres `pgvector` with 768-dim embeddings stored in `conversation_memory`.
Cosine similarity over IVFFLAT index; embeddings generated in `memory-indexer`.

## Alternatives
- External vector DB (Pinecone/Weaviate) — rejected due to ops overhead.
- In-app cosine — rejected for scale beyond ~10k rows.
