import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import AdSlot from "@/components/ads/AdSlot";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface Article {
  id: string; title: string; slug: string; summary: string | null;
  body_markdown: string; featured_image: string | null;
  seo_title: string | null; seo_description: string | null;
  reading_time_min: number; publish_at: string | null; created_at: string;
}

function tocFromMarkdown(md: string) {
  const lines = md.split("\n");
  const items: { level: number; text: string; id: string }[] = [];
  lines.forEach((l) => {
    const m = l.match(/^(#{2,3})\s+(.*)/);
    if (m) {
      const text = m[2].trim();
      items.push({ level: m[1].length, text, id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
    }
  });
  return items;
}

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [a, setA] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase.from("articles")
      .select("id,title,slug,summary,body_markdown,featured_image,seo_title,seo_description,reading_time_min,publish_at,created_at")
      .eq("slug", slug).eq("status", "published").maybeSingle()
      .then(({ data }) => { setA(data); setLoading(false); });
    // fire-and-forget view count
    supabase.rpc("increment_article_view" as never, { _slug: slug } as never).then(() => {});
  }, [slug]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!a) return <div className="p-10 text-center"><p className="text-muted-foreground">Article not found.</p><Link to="/blog" className="text-primary">Back to blog</Link></div>;

  const toc = tocFromMarkdown(a.body_markdown);

  return (
    <article className="max-w-4xl mx-auto px-4 py-10">
      <SEOHead title={a.seo_title || a.title} description={a.seo_description || a.summary || undefined} />
      {a.featured_image && <img src={a.featured_image} alt={a.title} className="w-full h-64 md:h-80 object-cover rounded-xl mb-6" />}
      <h1 className="text-3xl md:text-4xl font-bold mb-2">{a.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {a.publish_at ? new Date(a.publish_at).toLocaleDateString() : new Date(a.created_at).toLocaleDateString()} · {a.reading_time_min} min read
      </p>

      {toc.length > 2 && (
        <nav aria-label="Table of contents" className="mb-8 p-4 rounded-lg border border-border/60 bg-muted/30">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">On this page</p>
          <ul className="space-y-1 text-sm">
            {toc.map((t) => <li key={t.id} className={t.level === 3 ? "ml-4" : ""}><a href={`#${t.id}`} className="text-primary hover:underline">{t.text}</a></li>)}
          </ul>
        </nav>
      )}

      <AdSlot placement="article.after_first_section" className="my-8" />

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            h2: ({ children }) => {
              const t = String(children);
              return <h2 id={t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>{children}</h2>;
            },
            h3: ({ children }) => {
              const t = String(children);
              return <h3 id={t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>{children}</h3>;
            },
          }}
        >
          {a.body_markdown}
        </ReactMarkdown>
      </div>

      <AdSlot placement="article.before_related" className="my-10" />

      <div className="mt-10 pt-6 border-t border-border">
        <Link to="/blog" className="text-primary hover:underline">← Back to blog</Link>
      </div>
    </article>
  );
}
