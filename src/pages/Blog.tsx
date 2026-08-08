import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import AdSlot from "@/components/ads/AdSlot";

interface ArticleRow {
  id: string; slug: string; title: string; summary: string | null;
  thumbnail: string | null; featured_image: string | null;
  reading_time_min: number; publish_at: string | null; created_at: string;
}

export default function Blog() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  useEffect(() => {
    supabase.from("articles")
      .select("id,slug,title,summary,thumbnail,featured_image,reading_time_min,publish_at,created_at")
      .eq("status", "published")
      .order("publish_at", { ascending: false, nullsFirst: false })
      .limit(50)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <SEOHead
        title="Blog · GD Buddy"
        description="In-depth group discussion guides: how to open and close a GD, body language, common mistakes, and how to practice GD rounds with AI."
        path="/blog"
      />
      <h1 className="text-3xl font-bold mb-2">GD Buddy Blog</h1>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Practical, placement-focused writing on group discussions. Every guide below is
        written from what actually decides GD rounds — how you open, how much air time you
        take, how you handle interruptions, and how you close with a summary the panel
        remembers.
      </p>
      <div className="mb-8 max-w-3xl space-y-3 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">New to GD rounds?</strong> Start with the
          preparation guide, then read the opening and closing playbooks. Those three cover
          the moments panellists score hardest.
        </p>
        <p>
          <strong className="text-foreground">Already practising?</strong> Work through the
          common-mistakes and body-language guides, then run a simulated discussion with AI
          participants to test the habits under time pressure.
        </p>
      </div>


      <AdSlot placement="blog.top_banner" className="mb-8" />

      <div className="grid md:grid-cols-3 gap-6">
        {rows.length === 0 && <p className="col-span-full text-muted-foreground">No articles published yet.</p>}
        {rows.map((r, i) => (
          <div key={r.id} className="contents">
            <article className="group rounded-lg border border-border/60 overflow-hidden hover:border-primary/50 transition-colors">
              <Link to={`/blog/${r.slug}`}>
                {(r.thumbnail || r.featured_image) && (
                  <img src={r.thumbnail || r.featured_image!} alt={r.title} loading="lazy" className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <h2 className="font-semibold group-hover:text-primary transition-colors">{r.title}</h2>
                  {r.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>}
                  <div className="text-xs text-muted-foreground mt-3">{r.reading_time_min} min read</div>
                </div>
              </Link>
            </article>
            {i > 0 && (i + 1) % 6 === 0 && <AdSlot placement="blog.between_cards" className="md:col-span-3" />}
          </div>
        ))}
      </div>
    </div>
  );
}
