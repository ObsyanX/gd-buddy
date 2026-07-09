import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Plus } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

interface RevenueRow {
  id: string;
  ad_id: string | null;
  advertiser: string | null;
  amount_cents: number;
  source: string;
  currency: string;
  occurred_at: string;
}
interface AdOpt { id: string; title: string; }

function fmt(c: number, cur = "USD") {
  return new Intl.NumberFormat("en", { style: "currency", currency: cur }).format(c / 100);
}
function toCsv(rows: RevenueRow[]) {
  const head = ["id", "ad_id", "advertiser", "amount_cents", "source", "currency", "occurred_at"].join(",");
  const body = rows.map((r) => [r.id, r.ad_id, r.advertiser, r.amount_cents, r.source, r.currency, r.occurred_at].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  return `${head}\n${body}`;
}

export default function AdminRevenue() {
  const { isAdmin } = useUserRoles();
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [ads, setAds] = useState<AdOpt[]>([]);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("manual");
  const [advertiser, setAdvertiser] = useState("");
  const [adId, setAdId] = useState<string>("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: rev }, { data: adRows }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("ad_revenue_events") as any).select("id,ad_id,advertiser,amount_cents,source,currency,occurred_at").order("occurred_at", { ascending: false }).limit(500),
      supabase.from("advertisements").select("id,title").order("created_at", { ascending: false }).limit(200),
    ]);
    setRows((rev as RevenueRow[]) ?? []);
    setAds((adRows as AdOpt[]) ?? []);
  }

  async function record() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return toast({ title: "Enter an amount", variant: "destructive" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("ad_revenue_events") as any).insert({
      ad_id: adId || null, advertiser: advertiser || null, amount_cents: cents, source,
    });
    if (error) return toast({ title: "Record failed", description: error.message, variant: "destructive" });
    setAmount(""); setAdvertiser(""); setAdId("");
    toast({ title: "Revenue recorded" });
    load();
  }

  function downloadCsv() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ad-revenue-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
    const byAdvertiser = new Map<string, number>();
    let total = 0;
    rows.forEach((r) => {
      total += r.amount_cents;
      const k = r.advertiser ?? "(unattributed)";
      byAdvertiser.set(k, (byAdvertiser.get(k) ?? 0) + r.amount_cents);
    });
    return { total, byAdvertiser: [...byAdvertiser.entries()].sort((a, b) => b[1] - a[1]) };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ad revenue</h1>
          <p className="text-sm text-muted-foreground">Total attributed: <span className="font-medium text-foreground">{fmt(totals.total)}</span></p>
        </div>
        <Button variant="secondary" onClick={downloadCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Record revenue</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input placeholder="Amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
            <Input placeholder="Advertiser" value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} className="w-48" />
            <Select value={adId} onValueChange={setAdId}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Ad (optional)" /></SelectTrigger>
              <SelectContent>{ads.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="impression">Impression</SelectItem>
                <SelectItem value="click">Click</SelectItem>
                <SelectItem value="conversion">Conversion</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={record}><Plus className="h-4 w-4 mr-1" />Record</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By advertiser</CardTitle></CardHeader>
          <CardContent>
            {totals.byAdvertiser.length === 0 && <p className="text-sm text-muted-foreground">No revenue yet.</p>}
            <ul className="text-sm space-y-1">
              {totals.byAdvertiser.map(([name, cents]) => (
                <li key={name} className="flex justify-between border-b border-border/40 py-1 last:border-none">
                  <span>{name}</span><span className="font-mono">{fmt(cents)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
            <ul className="text-xs space-y-1">
              {rows.slice(0, 50).map((r) => (
                <li key={r.id} className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-none">
                  <span className="truncate">{r.advertiser ?? "—"} · {r.source}</span>
                  <span className="font-mono">{fmt(r.amount_cents, r.currency)}</span>
                  <span className="text-muted-foreground shrink-0">{new Date(r.occurred_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
