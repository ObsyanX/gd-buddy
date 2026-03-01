import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const topics = [
  { category: "Current Affairs", items: ["Impact of AI on Employment", "Digital India: Success or Failure?", "Climate Change and India's Role", "Social Media Regulation", "UPI and Digital Payments Revolution"] },
  { category: "Business & Economy", items: ["Startup Culture in India", "Cryptocurrency: Boon or Bane?", "Make in India vs Import Dependency", "Gig Economy and Worker Rights", "FDI in Indian Retail"] },
  { category: "Social Issues", items: ["Gender Equality in Workplaces", "Education System Reform", "Mental Health Awareness", "Rural vs Urban Development", "Reservation Policy in India"] },
  { category: "Technology", items: ["5G and its Impact", "Data Privacy Concerns", "Electric Vehicles Adoption", "Remote Work: Future of Employment?", "Ethical AI Development"] },
  { category: "Abstract", items: ["Is Necessity the Mother of Invention?", "Change is the Only Constant", "Quality vs Quantity", "Does Money Buy Happiness?", "Leaders are Born, Not Made"] },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "GD Topics for Placements",
  description: "Comprehensive list of group discussion topics for campus placement preparation",
  numberOfItems: topics.reduce((a, c) => a + c.items.length, 0),
  itemListElement: topics.flatMap((cat, ci) =>
    cat.items.map((item, i) => ({
      "@type": "ListItem",
      position: ci * 5 + i + 1,
      name: item,
    }))
  ),
};

const GDTopics = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="GD Topics for Placements 2025"
      description="50+ trending group discussion topics for campus placements. Practice with AI on current affairs, business, technology, social issues, and abstract topics."
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
        <h1 className="text-display font-bold mb-4">GD Topics for Placements 2025</h1>
        <p className="text-body text-muted-foreground mb-8">
          Group discussions are a critical part of campus placement rounds. Preparing with the right topics can make all the difference. Below is a curated list of 50+ trending GD topics across multiple categories that are frequently asked in placement drives at top companies.
        </p>

        <section className="mb-8">
          <h2 className="text-h2 font-bold mb-2">Why GD Topics Matter in Placements</h2>
          <p className="text-body text-muted-foreground mb-4">
            Recruiters use group discussions to assess communication skills, leadership ability, teamwork, and analytical thinking. Being familiar with current and classic GD topics helps you structure arguments, present balanced viewpoints, and stand out in competitive placement rounds. Companies like TCS, Infosys, Wipro, Deloitte, and major banks regularly conduct GD rounds.
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
              <Link to="/practice">Start Practicing Now</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-4 border-border">
              <Link to="/how-to-crack-group-discussion">GD Tips & Strategies</Link>
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-h2 font-bold mb-2">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="border-2 border-border p-4">
              <summary className="font-semibold cursor-pointer">What type of GD topics are asked in placements?</summary>
              <p className="mt-2 text-muted-foreground">Companies typically ask current affairs, business, technology, and abstract topics. The trend in 2025 is towards AI, sustainability, and digital economy topics.</p>
            </details>
            <details className="border-2 border-border p-4">
              <summary className="font-semibold cursor-pointer">How many GD topics should I prepare?</summary>
              <p className="mt-2 text-muted-foreground">Aim to be comfortable with at least 20-30 topics across categories. Focus on building frameworks rather than memorizing points.</p>
            </details>
            <details className="border-2 border-border p-4">
              <summary className="font-semibold cursor-pointer">Can I practice GD online?</summary>
              <p className="mt-2 text-muted-foreground">Yes! GD Buddy provides AI-powered group discussion simulation where you can practice with realistic AI participants and get instant feedback.</p>
            </details>
          </div>
        </section>
      </article>
    </main>

    <SEOFooter />
  </div>
);

export default GDTopics;
