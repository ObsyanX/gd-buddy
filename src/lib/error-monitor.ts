import { supabase } from '@/integrations/supabase/client';

interface ErrorLogEntry {
  error_message: string;
  error_stack?: string;
  error_source?: 'client' | 'edge_function' | 'network';
  page_url?: string;
  metadata?: Record<string, unknown>;
}

class ErrorMonitor {
  private queue: ErrorLogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FLUSH_INTERVAL = 5000;
  private readonly MAX_QUEUE_SIZE = 20;

  constructor() {
    // Listen for unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.capture({
          error_message: event.message,
          error_stack: event.error?.stack,
          error_source: 'client',
          page_url: window.location.href,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        this.capture({
          error_message: reason?.message || String(reason),
          error_stack: reason?.stack,
          error_source: 'client',
          page_url: window.location.href,
        });
      });
    }
  }

  capture(entry: ErrorLogEntry) {
    this.queue.push({
      ...entry,
      page_url: entry.page_url || (typeof window !== 'undefined' ? window.location.href : undefined),
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
      if (!user) return; // Don't log if not authenticated

      const rows = batch.map((entry) => ({
        user_id: user.id,
        error_message: entry.error_message.substring(0, 2000),
        error_stack: entry.error_stack?.substring(0, 5000) ?? null,
        error_source: entry.error_source || 'client',
        page_url: entry.page_url ?? null,
        metadata: (entry.metadata || {}) as Record<string, string>,
      }));

      await supabase.from('error_logs').insert(rows as any);
    } catch {
      // Silently fail — don't create error loops
      console.warn('[ErrorMonitor] Failed to flush error logs');
    }
  }
}

export const errorMonitor = new ErrorMonitor();
