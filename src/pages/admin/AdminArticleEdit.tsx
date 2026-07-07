import { useEffect, useMemo, useState } from "react";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

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
        setSeoTitle(data.seo_title ?? ""); setSeoDesc(data.seo_description ?? ""); setSeoKw(data.seo_keywords ?? "");
        setStatus(data.status);
        setPublishAt(data.publish_at ? new Date(data.publish_at).toISOString().slice(0, 16) : "");
      });
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const rt = useMemo(() => readingTime(body), [body]);

  async function save() {
    if (!title.trim()) return toast({ title: "Title required", variant: "destructive" });
    if (!slug.trim()) return toast({ title: "Slug required", variant: "destructive" });
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      category_id: categoryId || null,
      summary: summary || null,
      featured_image: featured || null,
      thumbnail: thumbnail || null,
      body_markdown: body,
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
      seo_keywords: seoKw || null,
      reading_time_min: rt,
      status,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      author_id: user?.id ?? null,
    };
    const res = isNew
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await supabase.from("articles").insert(payload as any).select("id").single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : await supabase.from("articles").update(payload as any).eq("id", id!).select("id").single();
    setSaving(false);
    if (res.error) return toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
    toast({ title: "Saved" });
    if (isNew && res.data?.id) nav(`/home/admin/articles/${res.data.id}/edit`, { replace: true });
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "New article" : "Edit article"}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => nav(-1)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

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
