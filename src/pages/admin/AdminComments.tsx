import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, Trash2, ShieldAlert, Clock } from "lucide-react";

type Status = "pending" | "approved" | "spam" | "deleted";

interface Row {
  id: string;
  body: string;
  status: Status;
  created_at: string;
  user_id: string | null;
  article_id: string;
  article_title?: string;
}

const STATUS_META: Record<Status, { label: string; icon: typeof Clock }> = {
  pending: { label: "Pending", icon: Clock },
  approved: { label: "Approved", icon: Check },
  spam: { label: "Spam", icon: ShieldAlert },
  deleted: { label: "Deleted", icon: Trash2 },
};

export default function AdminComments() {
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("article_comments")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, body, status, created_at, user_id, article_id, articles(title)") as any;
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
    setLoading(false);
    if (error) return toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).map((r: any) => ({ ...r, article_title: r.articles?.title })),
    );
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function moderate(id: string, status: Status) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("article_comments") as any)
      .update({ status, moderated_at: new Date().toISOString(), approved: status === "approved" })
      .eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setRows((r) => r.filter((x) => filter === "all" || x.id !== id));
    toast({ title: `Marked ${status}` });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comment moderation</h1>
          <p className="text-sm text-muted-foreground">Review, approve, spam, or delete article comments.</p>
        </div>
        <div className="w-48">
          <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No comments in this bucket.</CardContent></Card>
      )}

      <div className="grid gap-3">
        {rows.map((r) => {
          const Meta = STATUS_META[r.status];
          const Icon = Meta.icon;
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">
                    On <span className="text-primary">{r.article_title ?? "(unknown article)"}</span>
                  </CardTitle>
                  <Badge variant="secondary" className="gap-1"><Icon className="h-3 w-3" />{Meta.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · user {r.user_id?.slice(0, 8) ?? "anon"}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "approved" && <Button size="sm" onClick={() => moderate(r.id, "approved")}>Approve</Button>}
                  {r.status !== "pending" && <Button size="sm" variant="secondary" onClick={() => moderate(r.id, "pending")}>Re-queue</Button>}
                  {r.status !== "spam" && <Button size="sm" variant="secondary" onClick={() => moderate(r.id, "spam")}>Spam</Button>}
                  {r.status !== "deleted" && <Button size="sm" variant="destructive" onClick={() => moderate(r.id, "deleted")}>Delete</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
