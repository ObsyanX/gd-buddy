import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Row { id: string; name: string; advertiser: string | null; status: string; created_at: string; revenue_cents?: number; }

export default function AdminCampaigns() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [revenueByAdvertiser, setRevenueByAdvertiser] = useState<Record<string, number>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("ad_campaigns").select("id,name,advertiser,status,created_at").order("created_at", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRows((data as any) ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rev } = await (supabase.from("ad_revenue_events") as any).select("advertiser,amount_cents");
    const map: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rev ?? []).forEach((r: any) => {
      const k = r.advertiser ?? "";
      map[k] = (map[k] ?? 0) + (r.amount_cents ?? 0);
    });
    setRevenueByAdvertiser(map);
  }

  function exportCsv() {
    const head = ["id","name","advertiser","status","revenue_usd","created_at"].join(",");
    const body = rows.map((r) => [r.id, r.name, r.advertiser ?? "", r.status, ((revenueByAdvertiser[r.advertiser ?? ""] ?? 0) / 100).toFixed(2), r.created_at].map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `campaigns-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  async function create() {
    if (!name.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("ad_campaigns") as any).insert({ name: name.trim(), advertiser: advertiser.trim() || null, status: "active" });
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    setName(""); setAdvertiser(""); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Ad campaigns</h1>
        <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Card><CardContent className="pt-4 flex flex-wrap gap-2">
        <Input placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
        <Input placeholder="Advertiser" value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} className="w-56" />
        <Button onClick={create}><Plus className="h-4 w-4 mr-1" />New campaign</Button>
      </CardContent></Card>

      <div className="grid gap-2">
        {rows.map((r) => (
          <Card key={r.id}><CardContent className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.advertiser ?? "—"} · {r.status}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-mono tabular-nums">
                ${((revenueByAdvertiser[r.advertiser ?? ""] ?? 0) / 100).toFixed(2)}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
      </div>
    </div>
  );
}
