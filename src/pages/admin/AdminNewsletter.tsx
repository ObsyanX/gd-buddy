import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

interface Row {
  id: string;
  email: string;
  confirmed: boolean;
  source: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}

export default function AdminNewsletter() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("id,email,confirmed,source,unsubscribed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    setLoading(false);
    if (error) return toast({ title: "Load failed", description: error.message, variant: "destructive" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRows((data as any) ?? []);
  }

  function exportCsv() {
    const header = "email,confirmed,source,unsubscribed_at,created_at\n";
    const csv = rows
      .filter((r) => !q || r.email.toLowerCase().includes(q.toLowerCase()))
      .map((r) => [r.email, r.confirmed, r.source ?? "", r.unsubscribed_at ?? "", r.created_at].join(","))
      .join("\n");
    const blob = new Blob([header + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `newsletter_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => !q || r.email.toLowerCase().includes(q.toLowerCase()));
  const confirmed = rows.filter((r) => r.confirmed && !r.unsubscribed_at).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Newsletter subscribers</h1>
          <p className="text-sm text-muted-foreground">{confirmed} confirmed / {rows.length} total</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                    <td className="px-3 py-2">
                      {r.unsubscribed_at ? <Badge variant="destructive">Unsubscribed</Badge>
                        : r.confirmed ? <Badge>Confirmed</Badge>
                        : <Badge variant="secondary">Pending</Badge>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.source ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No subscribers.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
