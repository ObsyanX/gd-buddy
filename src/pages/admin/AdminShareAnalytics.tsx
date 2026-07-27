import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Share2, TrendingUp, Users, Download } from "lucide-react";

interface Row {
  id: string;
  created_at: string;
  kind: string;
  event_type: string;
  target: string | null;
  ref: string | null;
  room_code: string | null;
}

export default function AdminShareAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("share_events")
          .select("id, created_at, kind, event_type, target, ref, room_code")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        if (!cancelled) setRows((data ?? []) as Row[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const shares = rows.filter((r) => r.event_type === "share").length;
    const installs = rows.filter((r) => r.event_type === "install").length;
    const joins = rows.filter((r) => r.event_type === "join").length;
    const byTarget = new Map<string, number>();
    for (const r of rows) {
      if (r.event_type !== "share" || !r.target) continue;
      byTarget.set(r.target, (byTarget.get(r.target) ?? 0) + 1);
    }
    const top = [...byTarget.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { shares, installs, joins, top };
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="w-6 h-6" aria-hidden="true" /> Share Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share clicks, installs, and multiplayer joins attributed to shared links.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile icon={<Share2 />} label="Shares" value={stats.shares} />
        <StatTile icon={<Download />} label="Installs (PWA)" value={stats.installs} />
        <StatTile icon={<Users />} label="Multiplayer Joins" value={stats.joins} />
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" aria-hidden="true" /> Top share targets
        </h2>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : stats.top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No share activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {stats.top.map(([t, n]) => (
              <li key={t} className="flex items-center justify-between text-sm">
                <span className="capitalize">{t}</span>
                <span className="font-mono font-bold">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Recent events</h2>
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><span className="text-xs font-mono">{r.event_type}</span></TableCell>
                    <TableCell><span className="text-xs">{r.kind}</span></TableCell>
                    <TableCell><span className="text-xs">{r.target ?? "—"}</span></TableCell>
                    <TableCell><span className="text-xs font-mono">{r.ref ?? "—"}</span></TableCell>
                    <TableCell><span className="text-xs font-mono">{r.room_code ?? "—"}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </div>
    </Card>
  );
}
