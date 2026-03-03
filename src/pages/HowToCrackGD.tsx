import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, CheckCircle } from "lucide-react";

const faqJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Crack Group Discussion in Placements",
    description: "Complete guide on how to crack group discussions in placement rounds with proven tips and strategies.",
    author: { "@type": "Organization", name: "GD Buddy" },
    publisher: { "@type": "Organization", name: "GD Buddy" },
    mainEntityOfPage: { "@type": "WebPage" },
    datePublished: "2025-01-15",
    dateModified: "2026-03-03",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How do I start a group discussion?", acceptedAnswer: { "@type": "Answer", text: "Begin with a strong opening statement that defines the topic clearly. Use a fact, statistic, or thought-provoking question to grab attention." } },
      { "@type": "Question", name: "What are the dos and don'ts of GD?", acceptedAnswer: { "@type": "Answer", text: "Do: Listen actively, build on others' points, stay relevant. Don't: Interrupt aggressively, dominate the conversation, or go off-topic." } },
      { "@type": "Question", name: "How is GD scored in placements?", acceptedAnswer: { "@type": "Answer", text: "Evaluators score on content quality, communication skills, leadership, body language, and ability to work in a team. GD Buddy provides AI scoring on all these parameters." } },
    ],
  },
];

const tips = [
  { title: "Research the Topic Beforehand", desc: "Stay updated with current affairs, business news, and trending topics. Read newspapers, follow news apps, and note down key points for common GD topics." },
  { title: "Structure Your Arguments", desc: "Use frameworks like PREP (Point, Reason, Example, Point) or STAR (Situation, Task, Action, Result) to organize your thoughts before speaking." },
  { title: "Listen Before You Speak", desc: "Active listening shows maturity. Acknowledge others' points before adding your perspective. This builds credibility and shows teamwork." },
  { title: "Be the First or Last Speaker", desc: "Initiating the discussion or summarizing at the end leaves a strong impression. Both positions demonstrate leadership." },
  { title: "Control Your Body Language", desc: "Maintain eye contact, sit upright, use hand gestures moderately, and nod when listening. Non-verbal cues matter as much as verbal ones." },
  { title: "Avoid Fillers and Repetition", desc: "Words like 'um', 'like', 'basically' reduce your impact. Practice speaking clearly and concisely. GD Buddy tracks filler words in real-time." },
  { title: "Back Points with Data", desc: "Statistics, case studies, and real-world examples make your arguments more convincing than opinions alone." },
  { title: "Stay Calm Under Pressure", desc: "When challenged or interrupted, stay composed. Respond logically rather than emotionally. This shows emotional intelligence." },
];

const HowToCrackGD = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="How to Crack Group Discussion"
      description="Complete guide on how to crack group discussions in placement rounds. Learn GD tips, strategies, dos and don'ts, and practice with AI simulation."
      keywords="how to crack GD, group discussion tips, GD strategies for placements, GD dos and donts, GD preparation guide"
      path="/how-to-crack-group-discussion"
      jsonLd={faqJsonLd}
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
          <li aria-current="page">How to Crack GD</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">How to Crack Group Discussion in Placements</h1>
        <p className="text-body text-muted-foreground mb-8">
          Group discussions are one of the most common elimination rounds in campus placements. Whether you're appearing for IT companies, consulting firms, or banks, mastering GD skills is essential. This comprehensive guide covers proven strategies, common mistakes, and practical tips to help you clear GD rounds confidently.
        </p>

        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-4">8 Proven Tips to Crack Any GD</h2>
          <div className="grid gap-4">
            {tips.map((tip, i) => (
              <Card key={i} className="p-5 border-2 border-border">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 mt-1 flex-shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold mb-1">{tip.title}</h3>
                    <p className="text-muted-foreground text-sm">{tip.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-2">The GD Buddy Advantage</h2>
          <p className="text-body text-muted-foreground mb-4">
            Reading tips is helpful, but nothing beats actual practice. GD Buddy simulates real group discussions with AI participants who have different personalities, speaking styles, and viewpoints. You get real-time feedback on your pace, filler words, body language, and argument structure — metrics that are impossible to track when practicing alone.
          </p>
          <Button asChild size="lg" className="border-4 border-border">
            <Link to="/practice">Start a Practice Session</Link>
          </Button>
          <div className="mt-4 flex gap-4 flex-wrap text-sm">
            <Link to="/gd-topics-for-placements" className="text-muted-foreground hover:text-foreground underline">Browse 50+ GD topics for placements →</Link>
            <Link to="/common-gd-mistakes" className="text-muted-foreground hover:text-foreground underline">Common GD mistakes to avoid →</Link>
            <Link to="/communication-skills-for-gd" className="text-muted-foreground hover:text-foreground underline">Communication skills guide →</Link>
          </div>
        </section>

        <section>
          <h2 className="text-h2 font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqJsonLd[1].mainEntity.map((faq: any, i: number) => (
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

export default HowToCrackGD;
