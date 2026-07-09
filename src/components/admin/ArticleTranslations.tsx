import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { LOCALES, type Locale } from "@/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Translation {
  id?: string;
  article_id: string;
  locale: Locale;
  title: string;
  excerpt: string | null;
  body_markdown: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: "draft" | "published";
}

const TRANSLATABLE: Locale[] = LOCALES.map((l) => l.value).filter((l) => l !== "en");

export default function ArticleTranslations({ articleId }: { articleId: string }) {
  const [tab, setTab] = useState<Locale>(TRANSLATABLE[0]);
  const [byLocale, setByLocale] = useState<Record<string, Translation>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("article_translations") as any)
      .select("*")
      .eq("article_id", articleId);
    const map: Record<string, Translation> = {};
    ((data ?? []) as Translation[]).forEach((t) => { map[t.locale] = t; });
    setByLocale(map);
  }, [articleId]);

  useEffect(() => { load(); }, [load]);

  const current: Translation = byLocale[tab] ?? {
    article_id: articleId, locale: tab, title: "", excerpt: "", body_markdown: "",
    seo_title: "", seo_description: "", status: "draft",
  };

  function update(patch: Partial<Translation>) {
    setByLocale((prev) => ({ ...prev, [tab]: { ...current, ...patch } }));
  }

  async function save() {
    if (!current.title.trim()) return toast({ title: "Translation title required", variant: "destructive" });
    setSaving(true);
    const payload = { ...current, article_id: articleId, locale: tab };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("article_translations") as any).upsert(payload, { onConflict: "article_id,locale" });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: `Saved ${tab} translation` });
    load();
  }

  async function remove() {
    if (!byLocale[tab]?.id) return;
    if (!confirm(`Delete ${tab} translation?`)) return;
    await supabase.from("article_translations").delete().eq("id", byLocale[tab]!.id!);
    toast({ title: "Deleted" });
    setByLocale((prev) => { const next = { ...prev }; delete next[tab]; return next; });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Translations</CardTitle>
        <p className="text-xs text-muted-foreground">English is the source. Add published translations to serve them to matching visitors automatically.</p>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Locale)}>
          <TabsList>
            {TRANSLATABLE.map((l) => {
              const meta = LOCALES.find((x) => x.value === l)!;
              const has = byLocale[l];
              return (
                <TabsTrigger key={l} value={l}>
                  {meta.label} {has && <span className="ml-1 text-[10px] text-muted-foreground">({has.status})</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {TRANSLATABLE.map((l) => (
            <TabsContent key={l} value={l} className="space-y-3 mt-3">
              <div>
                <Label>Title</Label>
                <Input value={current.title} onChange={(e) => update({ title: e.target.value })} />
              </div>
              <div>
                <Label>Excerpt</Label>
                <Textarea rows={2} value={current.excerpt ?? ""} onChange={(e) => update({ excerpt: e.target.value })} />
              </div>
              <div>
                <Label>Body (Markdown)</Label>
                <Textarea rows={12} className="font-mono text-sm" value={current.body_markdown ?? ""} onChange={(e) => update({ body_markdown: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>SEO title</Label>
                  <Input value={current.seo_title ?? ""} onChange={(e) => update({ seo_title: e.target.value })} maxLength={60} />
                </div>
                <div>
                  <Label>SEO description</Label>
                  <Input value={current.seo_description ?? ""} onChange={(e) => update({ seo_description: e.target.value })} maxLength={160} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-40">
                  <Label>Status</Label>
                  <Select value={current.status} onValueChange={(v) => update({ status: v as "draft" | "published" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1" />
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save translation"}</Button>
                {byLocale[tab]?.id && <Button variant="ghost" onClick={remove}>Delete</Button>}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
