/**
 * Semantic similarity + duplicate-idea detection.
 *
 * Embeddings are 384-dim float arrays produced by the `memory-indexer`
 * edge function (Lovable AI Gateway `text-embedding-3-small` / Groq fallback).
 * All math is pure so we can unit-test without any network.
 */

export type Embedding = number[];

export function cosine(a: Embedding, b: Embedding): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface MemoryRow {
  message_id: string;
  content: string;
  embedding: Embedding;
  user_id: string | null;
  ts: number;
}

export interface DuplicateFinding {
  original_message_id: string;
  duplicate_message_id: string;
  similarity: number;
  original_content: string;
  duplicate_content: string;
}

/**
 * Find the closest prior utterance and, if similarity crosses the threshold,
 * report it as a semantic duplicate.
 */
export function findDuplicate(
  candidate: { message_id: string; content: string; embedding: Embedding },
  history: MemoryRow[],
  threshold = 0.86,
): DuplicateFinding | null {
  let best: { row: MemoryRow; sim: number } | null = null;
  for (const row of history) {
    if (row.message_id === candidate.message_id) continue;
    const sim = cosine(candidate.embedding, row.embedding);
    if (!best || sim > best.sim) best = { row, sim };
  }
  if (!best || best.sim < threshold) return null;
  return {
    original_message_id: best.row.message_id,
    duplicate_message_id: candidate.message_id,
    similarity: Number(best.sim.toFixed(3)),
    original_content: best.row.content,
    duplicate_content: candidate.content,
  };
}

/** Return top-K most relevant memories for a query embedding (semantic recall). */
export function topKRelevant(
  query: Embedding,
  history: MemoryRow[],
  k = 5,
): Array<{ row: MemoryRow; sim: number }> {
  return history
    .map((row) => ({ row, sim: cosine(query, row.embedding) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k);
}
