import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Flag { key: string; value: unknown; }

const DEFAULT_FLAGS = [
  { key: "ads.enable_video", value: true, desc: "Serve video-format ads." },
  { key: "ads.enable_popup", value: false, desc: "Show popup ads on landing." },
  { key: "ads.enable_sticky_footer", value: false, desc: "Show sticky-footer ads." },
  { key: "articles.autosave_ms", value: 30000, desc: "Article editor autosave interval (ms)." },
  { key: "comments.require_moderation", value: true, desc: "Hold new comments until an admin approves." },
];

export default function AdminSettings() {
  const [rows, setRows] = useState<Flag[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("admin_settings").select("key,value");
    const existing = new Map(((data as Flag[]) ?? []).map((r) => [r.key, r.value]));
    setRows(DEFAULT_FLAGS.map((f) => ({ key: f.key, value: existing.has(f.key) ? existing.get(f.key) : f.value })));
  }

  async function saveOne(key: string, raw: string) {
    setSaving(key);
    let parsed: unknown = raw;
    try { parsed = JSON.parse(raw); } catch { /* keep as string */ }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("admin_settings") as any).upsert({ key, value: parsed, updated_at: new Date().toISOString() });
    setSaving(null);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: `Saved ${key}` });
    load();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feature flags & settings</h1>
        <p className="text-sm text-muted-foreground">Runtime flags read by <code className="text-xs">useFeatureFlag()</code>. Values are JSON.</p>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <FlagCard key={r.key} row={r} onSave={saveOne} saving={saving === r.key} />
        ))}
      </div>
    </div>
  );
}

function FlagCard({ row, onSave, saving }: { row: Flag; onSave: (k: string, v: string) => void; saving: boolean }) {
  const [val, setVal] = useState(JSON.stringify(row.value));
  const isBool = typeof row.value === "boolean";
  const meta = DEFAULT_FLAGS.find((f) => f.key === row.key);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">{row.key}</CardTitle>
        {meta && <p className="text-xs text-muted-foreground">{meta.desc}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        <Label className="text-xs">Value (JSON)</Label>
        {isBool ? (
          <div className="flex gap-2">
            <Button size="sm" variant={val === "true" ? "default" : "secondary"} onClick={() => setVal("true")}>true</Button>
            <Button size="sm" variant={val === "false" ? "default" : "secondary"} onClick={() => setVal("false")}>false</Button>
          </div>
        ) : val.length > 40 ? (
          <Textarea value={val} onChange={(e) => setVal(e.target.value)} rows={3} className="font-mono text-xs" />
        ) : (
          <Input value={val} onChange={(e) => setVal(e.target.value)} className="font-mono text-sm" />
        )}
        <div>
          <Button size="sm" disabled={saving} onClick={() => onSave(row.key, val)}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
