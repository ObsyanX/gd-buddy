import { Link, useParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, ThumbsUp, ThumbsDown, Lightbulb, Quote } from "lucide-react";
import { getTopicBySlug, getRelatedTopics } from "@/data/gd-topics";
import NotFound from "./NotFound";

const GDTopicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const topic = slug ? getTopicBySlug(slug) : undefined;

  if (!topic) return <NotFound />;

  const related = getRelatedTopics(topic.relatedSlugs);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${topic.title} — GD Topic for Placements`,
      description: topic.overview.slice(0, 160),
      author: { "@type": "Organization", name: "GD Buddy" },
      publisher: { "@type": "Organization", name: "GD Buddy" },
      datePublished: "2026-03-08",
      dateModified: "2026-03-08",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: typeof window !== "undefined" ? window.location.origin : "https://gd-buddy.vercel.app" },
        { "@type": "ListItem", position: 2, name: "GD Topics", item: `${typeof window !== "undefined" ? window.location.origin : "https://gd-buddy.vercel.app"}/gd-topics-for-placements` },
        { "@type": "ListItem", position: 3, name: topic.title },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={`${topic.title} | GD Topic`}
        description={`Practice the GD topic "${topic.title}" with arguments for and against, key discussion points, and sample opening statements for placement GD rounds.`}
        keywords={`${topic.title}, GD topic, group discussion topic, ${topic.category} GD topics, placement GD`}
        path={`/gd-topic/${slug}`}
        jsonLd={jsonLd}
      />
      <header className="border-b-4 border-border p-4 md:p-6">
        <div className="container mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2" aria-label="Go to homepage">
            <MessageSquare className="w-8 h-8" />
            <span className="text-2xl font-bold">GD BUDDY</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-12 px-6 max-w-4xl">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <ol className="flex gap-2 flex-wrap">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li>/</li>
            <li><Link to="/gd-topics-for-placements" className="hover:text-foreground">GD Topics</Link></li>
            <li>/</li>
            <li aria-current="page">{topic.title}</li>
          </ol>
        </nav>

        <article>
          <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 mb-3 inline-block">{topic.category}</span>
          <h1 className="text-display font-bold mb-4">{topic.title}</h1>

          {/* Quick Summary */}
          <section className="border-2 border-border p-5 mb-8 bg-muted/30">
            <h2 className="font-bold mb-2">📋 Topic Overview</h2>
            <p className="text-sm text-muted-foreground">{topic.overview}</p>
          </section>

          {/* Arguments For & Against */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="w-5 h-5 text-primary" />
                <h2 className="text-h2 font-bold">Arguments For</h2>
              </div>
              <div className="space-y-3">
                {topic.argumentsFor.map((arg, i) => (
                  <Card key={i} className="p-4 border-2 border-border">
                    <p className="text-sm text-muted-foreground">{arg}</p>
                  </Card>
                ))}
              </div>
            </section>
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ThumbsDown className="w-5 h-5 text-destructive" />
                <h2 className="text-h2 font-bold">Arguments Against</h2>
              </div>
              <div className="space-y-3">
                {topic.argumentsAgainst.map((arg, i) => (
                  <Card key={i} className="p-4 border-2 border-border">
                    <p className="text-sm text-muted-foreground">{arg}</p>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* Discussion Points */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5" />
              <h2 className="text-h2 font-bold">Key Discussion Points</h2>
            </div>
            <div className="space-y-3">
              {topic.discussionPoints.map((point, i) => (
                <Card key={i} className="p-4 border-2 border-border">
                  <p className="text-sm">{point}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Opening Statements */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Quote className="w-5 h-5" />
              <h2 className="text-h2 font-bold">Sample Opening Statements</h2>
            </div>
            <div className="space-y-3">
              {topic.openingStatements.map((stmt, i) => (
                <Card key={i} className="p-4 border-l-4 border-primary bg-muted/20">
                  <p className="text-sm italic text-muted-foreground">"{stmt}"</p>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10 text-center border-4 border-border p-8">
            <h2 className="text-h2 font-bold mb-3">Practice This Topic with AI</h2>
            <p className="text-muted-foreground mb-4">Start a simulated GD on "{topic.title}" with AI participants who debate in real-time.</p>
            <Button asChild size="lg" className="border-4 border-border">
              <Link to="/home/practice">Start Practice Session</Link>
            </Button>
          </section>

          {/* Related Topics */}
          {related.length > 0 && (
            <section className="mb-10">
              <h2 className="text-h2 font-bold mb-4">Related GD Topics</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {related.map((r) => (
                  <Link key={r.slug} to={`/gd-topic/${r.slug}`} className="block group">
                    <Card className="p-4 border-2 border-border hover:shadow-md transition-shadow h-full">
                      <span className="text-xs font-mono text-muted-foreground">{r.category}</span>
                      <h3 className="font-bold mt-1">{r.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.overview}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Cross-links */}
          <section className="border-2 border-border p-5">
            <h2 className="font-bold mb-3">GD Preparation Resources</h2>
            <ul className="space-y-2 text-sm">
              <li><Link to="/gd-topics-for-placements" className="text-muted-foreground hover:text-foreground underline">All GD topics for placements →</Link></li>
              <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground hover:text-foreground underline">Complete GD preparation guide →</Link></li>
              <li><Link to="/how-to-crack-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to crack group discussion →</Link></li>
              <li><Link to="/how-to-start-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to start a GD →</Link></li>
            </ul>
          </section>
        </article>
      </main>

      <SEOFooter />
    </div>
  );
};

export default GDTopicPage;
