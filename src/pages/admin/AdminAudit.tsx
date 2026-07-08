import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Row {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: any;
}

export default function AdminAudit() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(500)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setRows((data as any) ?? []));
  }, []);

  const filtered = rows.filter((r) => !q || r.action.includes(q) || (r.resource_type ?? "").includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <Input placeholder="Filter action or resource…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
      </div>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Actor</th>
                <th className="text-left px-3 py-2">Action</th>
                <th className="text-left px-3 py-2">Resource</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.actor_user_id?.slice(0, 8) ?? "system"}</td>
                  <td className="px-3 py-2"><Badge variant="secondary">{r.action}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">{r.resource_type ?? "—"} {r.resource_id ? <span className="font-mono text-xs">/ {r.resource_id.slice(0,8)}</span> : null}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No events.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
