import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Start a Group Discussion — Opening Strategies",
    description: "Learn proven techniques to initiate a group discussion in placement rounds. 7 opening strategies that create a strong first impression.",
    author: { "@type": "Organization", name: "GD Buddy" },
    publisher: { "@type": "Organization", name: "GD Buddy" },
    datePublished: "2026-03-08T00:00:00+05:30",
    dateModified: "2026-03-08T00:00:00+05:30",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Should I always try to start the GD?", acceptedAnswer: { "@type": "Answer", text: "Not necessarily. Only initiate if you have a strong opening ready. A weak start hurts more than not starting. If someone else starts, focus on making a strong second or third contribution." } },
      { "@type": "Question", name: "What is the best way to open a group discussion?", acceptedAnswer: { "@type": "Answer", text: "The best openings use a relevant fact/statistic, a thought-provoking question, or a clear definition of the topic. Avoid generic openings like 'This is a very important topic'." } },
      { "@type": "Question", name: "How long should my opening statement be?", acceptedAnswer: { "@type": "Answer", text: "Keep your opening to 30-45 seconds. Define the topic, state your position, and set the direction for the discussion. Longer openings risk being seen as dominating." } },
      { "@type": "Question", name: "What is the best way to practice group discussion openings?", acceptedAnswer: { "@type": "Answer", text: "Use GD Buddy's AI-powered group discussion simulator to practice opening statements. The AI participants respond to your opening in real-time, helping you refine your technique." } },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://gd-buddy.vercel.app" },
      { "@type": "ListItem", position: 2, name: "GD Preparation", item: "https://gd-buddy.vercel.app/group-discussion-preparation-guide" },
      { "@type": "ListItem", position: 3, name: "How to Start GD", item: "https://gd-buddy.vercel.app/how-to-start-group-discussion" },
    ],
  },
];

const strategies = [
  { title: "Open with a Fact or Statistic", desc: "Starting with a relevant data point immediately establishes credibility. For example: 'According to a recent NASSCOM report, AI will create 97 million new jobs by 2025, which makes this topic particularly relevant for us as future professionals.'" },
  { title: "Ask a Thought-Provoking Question", desc: "A rhetorical question engages the group immediately. 'When we talk about social media regulation, who decides what's acceptable speech — the government, the platform, or the users?'" },
  { title: "Define the Scope", desc: "Clearly defining what the topic covers (and doesn't) shows analytical thinking. 'Let\'s break down Work from Home into three dimensions — productivity, employee well-being, and organizational culture.'" },
  { title: "Use a Quote or Anecdote", desc: "A relevant quote from a known figure adds weight. Keep it brief and immediately connect it to the topic. Avoid obscure quotes that need explaining." },
  { title: "Present a Contrarian View", desc: "Starting with a perspective that challenges the obvious shows independent thinking. 'While most people assume AI will replace jobs, I'd argue it will create more specialized roles than it eliminates.'" },
  { title: "Connect to Current Events", desc: "Linking the topic to recent news shows awareness. 'Just last week, India crossed 10 billion UPI transactions in a month — making this discussion about digital payments very timely.'" },
  { title: "Use the Classification Approach", desc: "Categorize the topic into sub-themes. 'I think we can look at this topic from three angles — economic impact, social implications, and environmental considerations.' This provides structure for the entire discussion." },
];

const StartGD = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="How to Start a Group Discussion"
      description="Learn 7 proven techniques to start a group discussion in placement rounds. Opening strategies that create a strong first impression and show leadership."
      keywords="how to start group discussion, GD opening statement, how to initiate GD, group discussion opening techniques, start GD in placements"
      path="/how-to-start-group-discussion"
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
          <li><Link to="/group-discussion-preparation-guide" className="hover:text-foreground">GD Preparation</Link></li>
          <li>/</li>
          <li aria-current="page">How to Start GD</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">How to Start a Group Discussion — 7 Opening Strategies</h1>

        <section className="border-2 border-border p-5 mb-8 bg-muted/30">
          <h2 className="font-bold mb-2">🚀 Quick Summary</h2>
          <p className="text-sm text-muted-foreground mb-3">Initiating a GD creates a strong first impression and shows leadership. The best openings use facts, questions, or scope definitions — not generic statements. Keep your opening to 30-45 seconds, and only initiate if you have a strong start ready.</p>
          <h3 className="font-bold text-sm mb-1">Top Opening Techniques</h3>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Open with a relevant fact or statistic</li>
            <li>Ask a thought-provoking question</li>
            <li>Define the scope and sub-themes</li>
            <li>Connect to a current event</li>
            <li>Present a contrarian perspective</li>
          </ol>
        </section>

        <p className="text-body text-muted-foreground mb-8">
          The opening of a group discussion sets the tone for the entire conversation. A strong start grabs attention, demonstrates preparation, and positions you as a leader. But starting poorly — with generic statements or incorrect facts — can hurt more than not starting at all. Here are 7 proven strategies to open a GD effectively.
        </p>

        <div className="grid gap-4 mb-10">
          {strategies.map((s, i) => (
            <Card key={i} className="p-5 border-2 border-border">
              <h2 className="font-bold mb-1">{`${i + 1}. ${s.title}`}</h2>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </Card>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-2">Practice Opening Statements</h2>
          <p className="text-body text-muted-foreground mb-4">
            GD Buddy has a dedicated "Opening Statement" skill drill where you practice crafting and delivering openings for different topics. The AI evaluates your opening on clarity, relevance, confidence, and impact.
          </p>
          <Button asChild size="lg" className="border-4 border-border">
            <Link to="/home/drills">Try Opening Statement Drill</Link>
          </Button>
        </section>

        <section className="mb-10 border-2 border-border p-5">
          <h2 className="font-bold mb-3">Related Resources</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground hover:text-foreground underline">Complete GD preparation guide →</Link></li>
            <li><Link to="/how-to-conclude-gd-round" className="text-muted-foreground hover:text-foreground underline">How to conclude a GD round →</Link></li>
            <li><Link to="/how-to-speak-confidently-in-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to speak confidently in GD →</Link></li>
            <li><Link to="/how-to-crack-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to crack group discussion →</Link></li>
            <li><Link to="/gd-topics-for-placements" className="text-muted-foreground hover:text-foreground underline">GD topics for placements →</Link></li>
          </ul>
        </section>

        <section>
          <h2 className="text-h2 font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {jsonLd[1].mainEntity.map((faq: any, i: number) => (
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

export default StartGD;
