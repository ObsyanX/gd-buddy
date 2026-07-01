/**
 * Offline resilience — IndexedDB-backed queue for participant events,
 * mic requests, and local transcript segments. Auto-flushes on reconnect.
 *
 * Spec § 9.6.
 */
import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'gdb-offline';
const DB_VERSION = 1;
const STORE = 'queue';

export type QueueKind =
  | 'participant_event'
  | 'mic_request'
  | 'transcript_segment'
  | 'event_log';

export interface QueuedItem {
  id?: number;
  kind: QueueKind;
  payload: any;
  session_id?: string;
  created_at: number;
  attempts: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const r = fn(store) as IDBRequest<T>;
    if (r && 'onsuccess' in r) {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } else {
      Promise.resolve(r as unknown as T).then(resolve, reject);
    }
    t.oncomplete = () => db.close();
  });
}

export async function enqueue(item: Omit<QueuedItem, 'id' | 'created_at' | 'attempts'>) {
  const record: QueuedItem = { ...item, created_at: Date.now(), attempts: 0 };
  await tx('readwrite', (s) => s.add(record));
}

export async function peekAll(): Promise<QueuedItem[]> {
  return tx('readonly', (s) => s.getAll() as IDBRequest<QueuedItem[]>);
}

async function remove(id: number) {
  await tx('readwrite', (s) => s.delete(id));
}

async function bumpAttempt(item: QueuedItem) {
  if (item.id == null) return;
  const next = { ...item, attempts: item.attempts + 1 };
  await tx('readwrite', (s) => s.put(next));
}

async function dispatch(item: QueuedItem): Promise<boolean> {
  try {
    switch (item.kind) {
      case 'mic_request':
        await supabase.rpc('request_mic', item.payload);
        return true;
      case 'event_log':
        await supabase.from('event_log').insert(item.payload);
        return true;
      case 'participant_event':
        await supabase.from('replay_events').insert(item.payload);
        return true;
      case 'transcript_segment':
        await supabase.from('gd_messages').insert(item.payload);
        return true;
    }
  } catch (e) {
    console.warn('[offline-queue] dispatch failed', item.kind, e);
    return false;
  }
  return false;
}

let flushing = false;
export async function flush(): Promise<{ sent: number; remaining: number }> {
  if (flushing || !navigator.onLine) return { sent: 0, remaining: 0 };
  flushing = true;
  let sent = 0;
  try {
    const items = await peekAll();
    for (const item of items) {
      if (item.attempts >= 5) { if (item.id != null) await remove(item.id); continue; }
      const ok = await dispatch(item);
      if (ok && item.id != null) { await remove(item.id); sent++; }
      else await bumpAttempt(item);
    }
    const remaining = (await peekAll()).length;
    return { sent, remaining };
  } finally {
    flushing = false;
  }
}

let installed = false;
export function installOfflineFlusher() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('online', () => { void flush(); });
  // Periodic best-effort retry
  setInterval(() => { if (navigator.onLine) void flush(); }, 30_000);
}
