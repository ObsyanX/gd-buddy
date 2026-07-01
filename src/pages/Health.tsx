import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HealthData {
  activeSessions: number;
  lastHeartbeat: string | null;
  audioEngine: 'suspended' | 'running' | 'closed' | 'unavailable';
  realtimeChannels: number;
  timestamp: string;
  status: 'ok' | 'degraded';
}

const Health = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval>;

    const probeAudio = (): HealthData['audioEngine'] => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return 'unavailable';
        const ctx = new AC();
        const state = ctx.state as HealthData['audioEngine'];
        void ctx.close().catch(() => {});
        return state;
      } catch {
        return 'unavailable';
      }
    };

    const check = async () => {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const [{ count: activeSessions }, { data: latest }] = await Promise.all([
        supabase
          .from('gd_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('last_activity_at', since),
        supabase
          .from('gd_sessions')
          .select('last_activity_at')
          .order('last_activity_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const channels = (supabase as any).getChannels?.() || [];
      const audioEngine = probeAudio();

      if (!mounted) return;
      setHealth({
        activeSessions: activeSessions ?? 0,
        lastHeartbeat: latest?.last_activity_at ?? null,
        audioEngine,
        realtimeChannels: channels.length,
        timestamp: new Date().toISOString(),
        status: audioEngine === 'unavailable' ? 'degraded' : 'ok',
      });
      setLoading(false);
    };

    check();
    interval = setInterval(check, 10_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !health) {
    return <div className="p-6 font-mono">Checking system health…</div>;
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-mono font-bold">System Health</h1>
        <Badge variant={health.status === 'ok' ? 'default' : 'destructive'}>
          {health.status.toUpperCase()}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Active Sessions (15m)</CardTitle></CardHeader>
          <CardContent className="text-3xl font-mono">{health.activeSessions}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Last Heartbeat</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono break-all">
            {health.lastHeartbeat ?? '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Audio Engine</CardTitle></CardHeader>
          <CardContent className="text-2xl font-mono">{health.audioEngine}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Realtime Channels</CardTitle></CardHeader>
          <CardContent className="text-3xl font-mono">{health.realtimeChannels}</CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        Refreshed {new Date(health.timestamp).toLocaleTimeString()} · auto every 10s
      </p>
      <pre className="text-xs bg-muted p-3 rounded overflow-auto">
        {JSON.stringify(health, null, 2)}
      </pre>
    </div>
  );
};

export default Health;
