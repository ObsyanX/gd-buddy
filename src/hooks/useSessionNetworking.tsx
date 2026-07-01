import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Slice 6: Networking resilience.
// - Watches browser online/offline and Supabase Realtime channel state.
// - Emits `status` = 'connected' | 'reconnecting' | 'offline'.
// - Every `heartbeatMs`, participants that are NOT the host inspect the
//   session's `last_activity_at`. If the host is stale beyond `stalenessMs`,
//   any participant may call `migrate_session_host`; the DB function makes it
//   idempotent (only one migration wins per stale window).

export type NetStatus = "connected" | "reconnecting" | "offline";

interface UseSessionNetworkingOptions {
  sessionId: string | null;
  isHost: boolean;
  heartbeatMs?: number;
  stalenessMs?: number;
  enabled?: boolean;
}

export function useSessionNetworking({
  sessionId,
  isHost,
  heartbeatMs = 15_000,
  stalenessMs = 45_000,
  enabled = true,
}: UseSessionNetworkingOptions) {
  const [status, setStatus] = useState<NetStatus>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "connected",
  );
  const [lastMigration, setLastMigration] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const online = () => setStatus("connected");
    const offline = () => setStatus("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    const tick = async () => {
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }

      // Host heartbeat: touch last_activity_at.
      if (isHost) {
        const { error } = await supabase
          .from("gd_sessions")
          .update({ last_activity_at: new Date().toISOString() })
          .eq("id", sessionId);
        if (error) setStatus("reconnecting");
        else setStatus("connected");
        return;
      }

      // Non-host: probe session health, trigger host migration if stale.
      const { data, error } = await supabase
        .from("gd_sessions")
        .select("host_user_id,last_activity_at,status")
        .eq("id", sessionId)
        .maybeSingle();

      if (error || !data) {
        setStatus("reconnecting");
        return;
      }
      setStatus("connected");

      if (data.status !== "active") return;
      const last = data.last_activity_at ? new Date(data.last_activity_at).getTime() : 0;
      if (Date.now() - last <= stalenessMs) return;

      const { data: mig, error: migErr } = await supabase.rpc("migrate_session_host", {
        _session_id: sessionId,
        _idle_seconds: Math.floor(stalenessMs / 1000),
      });
      if (!migErr && mig && (mig as any).status === "migrated") {
        setLastMigration((mig as any).new_host ?? null);
      }
    };

    // Fire once immediately, then interval.
    tick();
    timerRef.current = window.setInterval(tick, heartbeatMs);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionId, isHost, heartbeatMs, stalenessMs, enabled]);

  return { status, lastMigration };
}
