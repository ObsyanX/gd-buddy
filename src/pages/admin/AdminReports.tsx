import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

const EXPORTS: Array<{ table: string; label: string; cols: string }> = [
  { table: "articles", label: "Articles", cols: "id,slug,title,status,view_count,like_count,publish_at,created_at" },
  { table: "article_comments", label: "Comments", cols: "id,article_id,status,created_at" },
  { table: "advertisements", label: "Ads", cols: "id,title,advertiser,status,view_count,click_count,spend_cents,created_at" },
  { table: "newsletter_subscribers", label: "Newsletter", cols: "id,email,confirmed,source,created_at" },
  { table: "page_views", label: "Page views (recent 5k)", cols: "id,path,device,browser,country,created_at" },
];

async function exportTable(table: string, cols: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table as any) as any)
    .select(cols).order("created_at", { ascending: false }).limit(5000);
  if (error) return toast({ title: "Export failed", description: error.message, variant: "destructive" });
  const rows = (data as Record<string, unknown>[]) ?? [];
  if (rows.length === 0) return toast({ title: "Nothing to export" });
  const keys = cols.split(",");
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${table}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Reports & exports</h1>
      <p className="text-sm text-muted-foreground">Download recent rows as CSV for offline analysis.</p>
      <div className="grid gap-3">
        {EXPORTS.map((e) => (
          <Card key={e.table}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{e.label}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <code className="text-xs text-muted-foreground">{e.cols}</code>
              <Button size="sm" onClick={() => exportTable(e.table, e.cols)}><Download className="h-4 w-4 mr-1" />CSV</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
