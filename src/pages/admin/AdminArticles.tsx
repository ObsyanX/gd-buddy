import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  view_count: number;
  publish_at: string | null;
  updated_at: string;
  category_id: string | null;
}

export default function AdminArticles() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase.from("articles").select("id,title,slug,status,view_count,publish_at,updated_at,category_id").order("updated_at", { ascending: false }).limit(100);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
    const { data, error } = await query;
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function remove(id: string) {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
        <Button asChild size="sm"><Link to="/home/admin/articles/new"><Plus className="h-4 w-4 mr-1" />New article</Link></Button>
      </div>

      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…" className="pl-8" onKeyDown={(e) => e.key === "Enter" && load()} />
        </div>
        <Button variant="secondary" onClick={load}>Search</Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3 hidden md:table-cell">Slug</th>
              <th className="p-3">Status</th>
              <th className="p-3 hidden md:table-cell">Views</th>
              <th className="p-3 hidden lg:table-cell">Updated</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No articles yet.</td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.title}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell font-mono text-xs">{r.slug}</td>
                  <td className="p-3">
                    <Badge variant={r.status === "published" ? "default" : r.status === "scheduled" ? "secondary" : "outline"}>{r.status}</Badge>
                  </td>
                  <td className="p-3 hidden md:table-cell">{r.view_count}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Button asChild size="sm" variant="ghost"><Link to={`/home/admin/articles/${r.id}/edit`} aria-label={`Edit ${r.title}`}><Pencil className="h-4 w-4" /></Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label={`Delete ${r.title}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
