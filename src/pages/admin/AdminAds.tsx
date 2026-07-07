import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdRow {
  id: string; title: string; advertiser: string | null; status: string; ad_type: string;
  view_count: number; click_count: number; end_date: string | null;
}

export default function AdminAds() {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("advertisements")
      .select("id,title,advertiser,status,ad_type,view_count,click_count,end_date")
      .order("updated_at", { ascending: false }).limit(200);
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this ad?")) return;
    const { error } = await supabase.from("advertisements").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" }); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Advertisements</h1>
        <Button asChild size="sm"><Link to="/home/admin/ads/new"><Plus className="h-4 w-4 mr-1" />New ad</Link></Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3 hidden md:table-cell">Advertiser</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3 hidden md:table-cell">Views</th>
              <th className="p-3 hidden md:table-cell">Clicks</th>
              <th className="p-3 hidden lg:table-cell">CTR</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No ads yet.</td></tr>
              : rows.map((r) => {
                const ctr = r.view_count ? ((r.click_count / r.view_count) * 100).toFixed(2) : "0";
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-medium">{r.title}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{r.advertiser ?? "—"}</td>
                    <td className="p-3">{r.ad_type}</td>
                    <td className="p-3"><Badge variant={r.status === "active" ? "default" : "outline"}>{r.status}</Badge></td>
                    <td className="p-3 hidden md:table-cell">{r.view_count}</td>
                    <td className="p-3 hidden md:table-cell">{r.click_count}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{ctr}%</td>
                    <td className="p-3 text-right">
                      <Button asChild size="sm" variant="ghost"><Link to={`/home/admin/ads/${r.id}/edit`}><Pencil className="h-4 w-4" /></Link></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
