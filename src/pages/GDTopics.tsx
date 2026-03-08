import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { getTopicsByCategory } from "@/data/gd-topics";

const categorizedTopics = getTopicsByCategory();
const categories = Object.entries(categorizedTopics);

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "GD Topics for Placements 2025",
    description: "50+ trending group discussion topics for campus placements across current affairs, business, technology, social issues, and abstract categories.",
    author: { "@type": "Organization", name: "GD Buddy" },
    publisher: { "@type": "Organization", name: "GD Buddy" },
    mainEntityOfPage: { "@type": "WebPage" },
    datePublished: "2025-01-15",
    dateModified: "2026-03-08",
    numberOfTopics: categories.reduce((a, [, t]) => a + t.length, 0),
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GD Topics for Placements",
    description: "Comprehensive list of group discussion topics for campus placement preparation",
    numberOfItems: categories.reduce((a, [, t]) => a + t.length, 0),
    itemListElement: categories.flatMap(([, topics], ci) =>
      topics.map((t, i) => ({
        "@type": "ListItem",
        position: ci * 10 + i + 1,
        name: t.title,
        url: `https://gdbuddy.lovable.app/gd-topic/${t.slug}`,
      }))
    ),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What type of GD topics are asked in placements?", acceptedAnswer: { "@type": "Answer", text: "Companies typically ask current affairs, business, technology, and abstract topics. The trend in 2025 is towards AI, sustainability, and digital economy topics." } },
      { "@type": "Question", name: "How many GD topics should I prepare?", acceptedAnswer: { "@type": "Answer", text: "Aim to be comfortable with at least 20-30 topics across categories. Focus on building frameworks rather than memorizing points." } },
      { "@type": "Question", name: "Can I practice GD online?", acceptedAnswer: { "@type": "Answer", text: "Yes! GD Buddy provides AI-powered group discussion simulation where you can practice with realistic AI participants and get instant feedback." } },
    ],
  },
];

const GDTopics = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title={`GD Topics for Placements 2025 — ${categories.reduce((a, [, t]) => a + t.length, 0)}+ Topics`}
      description={`${categories.reduce((a, [, t]) => a + t.length, 0)}+ trending group discussion topics for campus placements. Practice with AI on current affairs, business, technology, social issues, and abstract topics.`}
      keywords="GD topics, group discussion topics for placement, GD topics 2025, current affairs GD topics, abstract GD topics"
      path="/gd-topics-for-placements"
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
        <ol className="flex gap-2">
          <li><Link to="/" className="hover:text-foreground">Home</Link></li>
          <li>/</li>
          <li aria-current="page">GD Topics</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">GD Topics for Placements 2025 — {categories.reduce((a, [, t]) => a + t.length, 0)}+ Topics</h1>

        {/* LLM-friendly Quick Summary */}
        <section className="border-2 border-border p-5 mb-8 bg-muted/30" aria-label="Quick summary">
          <h2 className="font-bold mb-2">📋 Quick Summary</h2>
          <p className="text-sm text-muted-foreground mb-3">This page contains {categories.reduce((a, [, t]) => a + t.length, 0)}+ curated group discussion topics across {categories.length} categories — frequently asked in campus placements at top companies. Click any topic for detailed arguments, discussion points, and sample opening statements.</p>
          <h3 className="font-bold text-sm mb-1">Key Takeaways</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Prepare 20-30 topics across categories for comprehensive coverage</li>
            <li>AI, sustainability, and digital economy are trending in 2025</li>
            <li>Build argument frameworks instead of memorizing talking points</li>
            <li>Practice speaking on topics aloud using <Link to="/ai-gd-simulator" className="underline hover:text-foreground">AI GD simulation</Link></li>
          </ul>
        </section>

        <p className="text-body text-muted-foreground mb-8">
          Group discussions are a critical part of campus placement rounds. Preparing with the right topics can make all the difference. Below is a curated list of 50+ trending GD topics across multiple categories that are frequently asked in placement drives at top companies.
        </p>

        <section className="mb-8">
          <h2 className="text-h2 font-bold mb-2">Why GD Topics Matter in Placements</h2>
          <p className="text-body text-muted-foreground mb-4">
            Recruiters use group discussions to assess <a href="https://en.wikipedia.org/wiki/Communication" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">communication skills</a>, leadership ability, teamwork, and analytical thinking. Being familiar with current and classic GD topics helps you structure arguments, present balanced viewpoints, and stand out in competitive placement rounds. Companies like TCS, Infosys, Wipro, Deloitte, and major banks regularly conduct GD rounds.
          </p>
        </section>

        {topics.map((cat) => (
          <section key={cat.category} className="mb-8">
            <h2 className="text-h2 font-bold mb-4">{cat.category} Topics</h2>
            <div className="grid gap-3">
              {cat.items.map((topic) => (
                <Card key={topic} className="p-4 border-2 border-border">
                  <h3 className="font-semibold">{topic}</h3>
                </Card>
              ))}
            </div>
          </section>
        ))}

        <section className="mb-8">
          <h2 className="text-h2 font-bold mb-2">How to Prepare for These Topics</h2>
          <p className="text-body text-muted-foreground mb-4">
            Reading about topics is not enough. You need to practice speaking on them in a group setting. GD Buddy lets you simulate realistic group discussions with AI participants who challenge your points, ask questions, and present counterarguments — just like a real placement GD round. You get real-time feedback on your fluency, structure, and body language.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button asChild size="lg" className="border-4 border-border">
              <Link to="/home/practice">Start Practicing Now</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-4 border-border">
              <Link to="/how-to-crack-group-discussion">GD Tips & Strategies</Link>
            </Button>
          </div>
        </section>

        {/* Related Resources */}
        <section className="mb-10 border-2 border-border p-5">
          <h2 className="font-bold mb-3">Related Resources</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/how-to-crack-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to crack group discussion — tips & strategies →</Link></li>
            <li><Link to="/common-gd-mistakes" className="text-muted-foreground hover:text-foreground underline">10 common GD mistakes to avoid →</Link></li>
            <li><Link to="/communication-skills-for-gd" className="text-muted-foreground hover:text-foreground underline">Communication skills for group discussion →</Link></li>
            <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground hover:text-foreground underline">Complete GD preparation guide →</Link></li>
            <li><a href="https://hbr.org/topic/subject/leadership" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground underline">Harvard Business Review: Leadership insights ↗</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-h2 font-bold mb-2">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {jsonLd[2].mainEntity.map((faq: any, i: number) => (
              <details key={i} className="border-2 border-border p-4">
                <summary className="font-semibold cursor-pointer">{faq.name}</summary>
                <p className="mt-2 text-muted-foreground">{faq.acceptedAnswer.text}</p>
              </details>
            ))}
          </div>
        </section>
      </article>
    </main>

    <SEOFooter />
  </div>
);

export default GDTopics;
