import { supabase } from '@/integrations/supabase/client';

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

interface ErrorLogEntry {
  error_message: string;
  error_stack?: string;
  error_source?: 'client' | 'edge_function' | 'network';
  page_url?: string;
  metadata?: Record<string, unknown>;
}

const HOOK_WARNING_PATTERNS = [
  'change in the order of hooks',
  'rendered more hooks than',
  'rendered fewer hooks than',
  'should have a queue',
  'invalid hook call',
];

export function classifySeverity(message: string): ErrorSeverity {
  const m = (message || '').toLowerCase();
  if (m.includes('should have a queue') || m.includes('rendered more hooks') || m.includes('rendered fewer hooks') || m.includes('invalid hook call')) return 'critical';
  if (m.includes('cannot access') && m.includes('before initialization')) return 'high';
  if (m.includes('change in the order of hooks')) return 'high';
  if (m.includes('permission') || m.includes('rls')) return 'high';
  if (m.includes('network') || m.includes('failed to fetch')) return 'medium';
  return 'low';
}

class ErrorMonitor {
  private queue: ErrorLogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private recent = new Map<string, number>();
  private readonly FLUSH_INTERVAL = 5000;
  private readonly MAX_QUEUE_SIZE = 20;
  private readonly DEDUPE_MS = 60_000;
  private readonly IGNORED_MESSAGES = [
    'cannot close a closed audiocontext',
  ];

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.capture({
        error_message: event.message,
        error_stack: event.error?.stack,
        error_source: 'client',
        page_url: window.location.href,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason: any = event.reason;
      this.capture({
        error_message: reason?.message || String(reason),
        error_stack: reason?.stack,
        error_source: 'client',
        page_url: window.location.href,
      });
    });

    // Intercept console.error to capture React hook/order warnings that never throw.
    const originalError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      try {
        const text = args
          .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
          .join(' ');
        const lower = text.toLowerCase();
        if (HOOK_WARNING_PATTERNS.some((p) => lower.includes(p))) {
          const stack = args.find((a) => a instanceof Error) as Error | undefined;
          this.capture({
            error_message: text.slice(0, 500),
            error_stack: stack?.stack || new Error().stack,
            error_source: 'client',
            page_url: window.location.href,
            metadata: { react_hook_warning: true },
          });
        }
      } catch { /* never break console */ }
      originalError(...(args as []));
    };
  }

  capture(entry: ErrorLogEntry) {
    const normalized = (entry.error_message || '').toLowerCase();
    if (this.IGNORED_MESSAGES.some((msg) => normalized.includes(msg))) {
      return;
    }

    const key = `${entry.error_source || 'client'}|${entry.page_url || ''}|${entry.error_message}`;
    const now = Date.now();
    const lastSeen = this.recent.get(key) || 0;
    if (now - lastSeen < this.DEDUPE_MS) return;
    this.recent.set(key, now);

    const severity = classifySeverity(entry.error_message || '');

    this.queue.push({
      ...entry,
      page_url: entry.page_url || (typeof window !== 'undefined' ? window.location.href : undefined),
      metadata: { ...(entry.metadata || {}), severity },
    });

    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }

  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = batch.map((entry) => ({
        user_id: user.id,
        error_message: entry.error_message.substring(0, 2000),
        error_stack: entry.error_stack?.substring(0, 5000) ?? null,
        error_source: entry.error_source || 'client',
        page_url: entry.page_url ?? null,
        metadata: (entry.metadata || {}) as Record<string, unknown>,
      }));

      await supabase.from('error_logs').insert(rows as any);
    } catch {
      console.warn('[ErrorMonitor] Failed to flush error logs');
    }
  }
}

export const errorMonitor = new ErrorMonitor();
