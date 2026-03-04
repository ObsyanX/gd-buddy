import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, XCircle } from "lucide-react";

const articleJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "10 Common GD Mistakes That Cost You Placements",
    description: "Avoid these 10 common group discussion mistakes that cost candidates their placement.",
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
      { "@type": "Question", name: "What is the biggest mistake in group discussions?", acceptedAnswer: { "@type": "Answer", text: "The biggest mistake is speaking without listening. Evaluators notice when you repeat points or go off-topic because you weren't paying attention to others." } },
      { "@type": "Question", name: "How do I avoid getting nervous in a GD?", acceptedAnswer: { "@type": "Answer", text: "Practice regularly with mock GDs. GD Buddy's AI simulation helps you get comfortable speaking in group settings, reducing anxiety for the real round." } },
    ],
  },
];

const mistakes = [
  { title: "Speaking Without Listening", desc: "Many candidates focus on talking more rather than listening. Evaluators notice when you repeat what someone already said or go off-topic because you weren't paying attention." },
  { title: "Being Too Aggressive", desc: "Dominating the conversation or interrupting others aggressively is a red flag. Assertiveness is valued, but aggression is not. GD Buddy tracks interruption patterns." },
  { title: "Not Initiating or Summarizing", desc: "Staying passive throughout the discussion makes you invisible. Either initiate the discussion or take charge of summarizing — both show leadership." },
  { title: "Using Too Many Fillers", desc: "Excessive 'um', 'uh', 'like', 'you know' reduces your credibility. Practice speaking in complete sentences. GD Buddy counts your filler words in real-time." },
  { title: "Going Off-Topic", desc: "Bringing up irrelevant points or personal anecdotes that don't connect to the topic shows poor analytical thinking. Stay focused and relevant." },
  { title: "Poor Body Language", desc: "Slouching, avoiding eye contact, fidgeting, or crossing arms sends negative signals. Your body language is being evaluated alongside your words." },
  { title: "Not Backing Arguments with Facts", desc: "Opinions without data or examples are weak. Always support your points with statistics, case studies, or real-world references." },
  { title: "Speaking in a Monotone", desc: "Lack of vocal variety makes even good points sound boring. Vary your pitch, pace, and volume to keep the group engaged." },
  { title: "Getting Emotional", desc: "When someone disagrees, getting defensive or emotional is a common mistake. Stay calm, acknowledge their point, and respond logically." },
  { title: "Not Practicing Beforehand", desc: "The biggest mistake is going unprepared. Practicing with mock GDs — especially AI-simulated ones — builds confidence and highlights areas to improve." },
];

const CommonGDMistakes = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="Common GD Mistakes to Avoid"
      description="Avoid these 10 common group discussion mistakes that cost candidates their placement. Learn what NOT to do in a GD round and how to fix these habits."
      keywords="common GD mistakes, group discussion mistakes, GD errors in placements, what not to do in GD, GD round tips"
      path="/common-gd-mistakes"
      jsonLd={articleJsonLd}
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
          <li aria-current="page">Common GD Mistakes</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">10 Common GD Mistakes That Cost You Placements</h1>
        <p className="text-body text-muted-foreground mb-8">
          Most candidates lose in the GD round not because they lack knowledge, but because they make avoidable mistakes. Understanding and fixing these common errors can dramatically improve your GD performance and help you clear placement rounds.
        </p>

        <div className="grid gap-4 mb-10">
          {mistakes.map((m, i) => (
            <Card key={i} className="p-5 border-2 border-border">
              <div className="flex gap-3">
                <XCircle className="w-5 h-5 mt-1 flex-shrink-0 text-destructive" aria-hidden="true" />
                <div>
                  <h2 className="font-bold mb-1">{`${i + 1}. ${m.title}`}</h2>
                  <p className="text-muted-foreground text-sm">{m.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <section>
          <h2 className="text-h2 font-bold mb-2">Fix These Mistakes with AI Practice</h2>
          <p className="text-body text-muted-foreground mb-4">
            GD Buddy's AI-powered simulation helps you identify and fix these mistakes in real-time. Get feedback on your speaking patterns, body language, and argument quality — all before your actual placement GD.
          </p>
          <Button asChild size="lg" className="border-4 border-border">
            <Link to="/home/practice">Practice Now</Link>
          </Button>
          <div className="mt-4 flex gap-4 flex-wrap text-sm">
            <Link to="/how-to-crack-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to crack group discussion →</Link>
            <Link to="/communication-skills-for-gd" className="text-muted-foreground hover:text-foreground underline">Communication skills for GD →</Link>
            <Link to="/gd-topics-for-placements" className="text-muted-foreground hover:text-foreground underline">GD topics for placements →</Link>
          </div>
        </section>

        <section>
          <h2 className="text-h2 font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {articleJsonLd[1].mainEntity.map((faq: any, i: number) => (
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

export default CommonGDMistakes;
