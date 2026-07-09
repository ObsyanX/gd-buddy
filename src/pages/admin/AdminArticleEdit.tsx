import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/useAutosave";
import { History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import ArticleTranslations from "@/components/admin/ArticleTranslations";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

interface Revision { id: string; title: string | null; summary: string | null; body_markdown: string | null; created_at: string; }

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
function readingTime(md: string) {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

interface Category { id: string; name: string; }

export default function AdminArticleEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const { user } = useAuth();
  const i18nEnabled = useFeatureFlag<boolean>("articles.i18n_enabled", true);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [featured, setFeatured] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [body, setBody] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKw, setSeoKw] = useState("");
  const [status, setStatus] = useState("draft");
  const [publishAt, setPublishAt] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const lastSavedBody = useRef<string>("");

  const loadRevisions = useCallback(async () => {
    if (isNew || !id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("article_revisions") as any)
      .select("id,title,summary,body_markdown,created_at")
      .eq("article_id", id).order("created_at", { ascending: false }).limit(20);
    setRevisions((data as Revision[]) ?? []);
  }, [id, isNew]);

  useEffect(() => {
    supabase.from("article_categories").select("id,name").order("name").then(({ data }) => setCats(data ?? []));
    if (!isNew && id) {
      supabase.from("articles").select("*").eq("id", id).maybeSingle().then(({ data }) => {
        if (!data) return;
        setTitle(data.title); setSlug(data.slug); setSlugTouched(true);
        setCategoryId(data.category_id ?? "");
        setSummary(data.summary ?? "");
        setFeatured(data.featured_image ?? "");
        setThumbnail(data.thumbnail ?? "");
        setBody(data.body_markdown ?? "");
        lastSavedBody.current = data.body_markdown ?? "";
        setSeoTitle(data.seo_title ?? ""); setSeoDesc(data.seo_description ?? ""); setSeoKw(data.seo_keywords ?? "");
        setStatus(data.status);
        setPublishAt(data.publish_at ? new Date(data.publish_at).toISOString().slice(0, 16) : "");
      });
      loadRevisions();
    }
  }, [id, isNew, loadRevisions]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const rt = useMemo(() => readingTime(body), [body]);

  const doSave = useCallback(async (auto = false) => {
    if (!title.trim()) { if (!auto) toast({ title: "Title required", variant: "destructive" }); return; }
    if (!slug.trim()) { if (!auto) toast({ title: "Slug required", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      title: title.trim(), slug: slug.trim(), category_id: categoryId || null,
      summary: summary || null, featured_image: featured || null, thumbnail: thumbnail || null,
      body_markdown: body, seo_title: seoTitle || null, seo_description: seoDesc || null,
      seo_keywords: seoKw || null, reading_time_min: rt, status,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      author_id: user?.id ?? null,
    };
    const res = isNew
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await supabase.from("articles").insert(payload as any).select("id").single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : await supabase.from("articles").update(payload as any).eq("id", id!).select("id").single();
    setSaving(false);
    if (res.error) { if (!auto) toast({ title: "Save failed", description: res.error.message, variant: "destructive" }); return; }
    // snapshot a revision when body changed materially
    const savedId = isNew ? res.data?.id : id;
    if (savedId && body !== lastSavedBody.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("article_revisions") as any).insert({
        article_id: savedId, editor_id: user?.id ?? null,
        title: payload.title, body_markdown: body, summary: payload.summary,
      });
      lastSavedBody.current = body;
      loadRevisions();
    }
    if (!auto) toast({ title: "Saved" });
    if (isNew && res.data?.id) nav(`/home/admin/articles/${res.data.id}/edit`, { replace: true });
  }, [title, slug, categoryId, summary, featured, thumbnail, body, seoTitle, seoDesc, seoKw, rt, status, publishAt, user, isNew, id, nav, loadRevisions]);

  const { status: autoStatus, savedAt } = useAutosave({
    value: body,
    delay: 30000,
    enabled: !isNew && !!id,
    onSave: async () => { await doSave(true); },
  });

  function restore(rev: Revision) {
    if (!confirm("Restore this revision? Current unsaved body will be lost.")) return;
    setBody(rev.body_markdown ?? "");
    setTitle(rev.title ?? title);
    if (rev.summary) setSummary(rev.summary);
    toast({ title: "Restored — click Save to persist" });
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "New article" : "Edit article"}</h1>
          {!isNew && (
            <p className="text-xs text-muted-foreground mt-1">
              {autoStatus === "saving" ? "Autosaving…" : autoStatus === "saved" && savedAt ? `Autosaved at ${savedAt.toLocaleTimeString()}` : autoStatus === "error" ? "Autosave failed" : "Autosaves every 30s"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="ghost" onClick={() => setShowRevisions((s) => !s)}>
              <History className="h-4 w-4 mr-1" />History ({revisions.length})
            </Button>
          )}
          <Button variant="secondary" onClick={() => nav(-1)}>Cancel</Button>
          <Button onClick={() => doSave(false)} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      {showRevisions && !isNew && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Revision history</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {revisions.length === 0 && <p className="text-sm text-muted-foreground">No revisions yet.</p>}
            {revisions.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-none">
                <div>
                  <div className="font-medium">{r.title ?? "(no title)"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {(r.body_markdown?.length ?? 0)} chars</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => restore(r)}>Restore</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Content</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} className="font-mono text-sm" />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Body (Markdown)</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={18} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1">{rt} min read · GFM + syntax highlight supported</p>
            </div>
            <div>
              <Label>Preview</Label>
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-border p-4 bg-muted/20 min-h-[200px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {body || "*Nothing to preview yet.*"}
                </ReactMarkdown>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Publish</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Publish at</Label>
                <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Images</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Featured image URL</Label>
                <Input value={featured} onChange={(e) => setFeatured(e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>SEO title</Label>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={60} />
              </div>
              <div>
                <Label>SEO description</Label>
                <Textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} maxLength={160} />
              </div>
              <div>
                <Label>Keywords</Label>
                <Input value={seoKw} onChange={(e) => setSeoKw(e.target.value)} placeholder="comma, separated" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
