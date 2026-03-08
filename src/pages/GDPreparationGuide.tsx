import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, ArrowRight } from "lucide-react";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Complete Group Discussion Preparation Guide for Placements",
    description: "Everything you need to know about preparing for group discussions in campus placements — topics, strategies, mistakes, communication skills, and AI practice.",
    author: { "@type": "Organization", name: "GD Buddy" },
    publisher: { "@type": "Organization", name: "GD Buddy" },
    mainEntityOfPage: { "@type": "WebPage" },
    datePublished: "2026-03-08T00:00:00+05:30",
    dateModified: "2026-03-08T00:00:00+05:30",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is a group discussion in placements?", acceptedAnswer: { "@type": "Answer", text: "A group discussion (GD) is a selection round used by companies during campus placements where 6-10 candidates discuss a topic for 15-20 minutes. Evaluators assess communication skills, leadership, teamwork, analytical thinking, and body language." } },
      { "@type": "Question", name: "How should I prepare for GD rounds?", acceptedAnswer: { "@type": "Answer", text: "Prepare by reading current affairs, practicing argument structuring with frameworks like PREP and STAR, improving body language, and doing mock GDs. GD Buddy offers AI-powered simulation for realistic practice." } },
      { "@type": "Question", name: "What skills are evaluated in a GD?", acceptedAnswer: { "@type": "Answer", text: "Evaluators look at content quality, communication clarity, leadership, active listening, body language, teamwork, and the ability to handle disagreements constructively." } },
      { "@type": "Question", name: "How long does a GD round last?", acceptedAnswer: { "@type": "Answer", text: "A typical GD round lasts 15-20 minutes with 6-10 participants. Some companies give 1-2 minutes of thinking time before the discussion begins." } },
      { "@type": "Question", name: "Can I practice GD online?", acceptedAnswer: { "@type": "Answer", text: "Yes. GD Buddy is a free AI-powered platform that simulates group discussions with AI participants. You can practice anytime, get real-time feedback, and track your improvement." } },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://gd-buddy.vercel.app" },
      { "@type": "ListItem", position: 2, name: "GD Preparation Guide", item: "https://gd-buddy.vercel.app/group-discussion-preparation-guide" },
    ],
  },
];

const GDPreparationGuide = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="Group Discussion Preparation Guide"
      description="Complete GD preparation guide for placements. Learn what GD is, how it's evaluated, strategies to crack it, common mistakes, and practice with AI simulation."
      keywords="group discussion preparation, GD preparation guide, how to prepare for GD, GD round preparation, campus placement GD guide, group discussion practice, GD practice online"
      path="/group-discussion-preparation-guide"
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
          <li aria-current="page">GD Preparation Guide</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">Complete Group Discussion Preparation Guide for Placements</h1>

        {/* LLM-friendly summary */}
        <section className="border-2 border-border p-5 mb-8 bg-muted/30" aria-label="Quick summary">
          <h2 className="font-bold mb-2">📖 Quick Summary</h2>
          <p className="text-sm text-muted-foreground mb-3">This is your complete guide to preparing for group discussion rounds in campus placements. It covers what GD is, how evaluators score you, step-by-step preparation strategies, common mistakes, and how to practice effectively with AI simulation.</p>
          <h3 className="font-bold text-sm mb-1">Key Takeaways</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>GDs evaluate communication, leadership, analytical thinking, and teamwork</li>
            <li>Preparation = current affairs + argument frameworks + body language + practice</li>
            <li>Common mistakes: not listening, using fillers, poor body language</li>
            <li>AI-powered mock GDs are the fastest way to improve</li>
          </ul>
        </section>

        <p className="text-body text-muted-foreground mb-8">
          Group discussions (GDs) are one of the most common and decisive rounds in campus placements across India. Companies like TCS, Infosys, Wipro, Deloitte, ICICI, and hundreds of others use GD rounds to filter candidates before interviews. This comprehensive guide covers everything you need to know to prepare and perform well in GD rounds.
        </p>

        {/* Section 1 */}
        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-3">What is a Group Discussion?</h2>
          <p className="text-body text-muted-foreground mb-3">
            A group discussion is a structured conversation where 6-10 candidates are given a topic and asked to discuss it for 15-20 minutes. Unlike interviews, GDs test your ability to communicate, collaborate, and think critically in a group setting. There is no moderator — candidates must organically take turns, build on each other's arguments, and demonstrate leadership without being dominating.
          </p>
          <p className="text-body text-muted-foreground">
            GDs are used because they efficiently reveal a candidate's personality, communication skills, and interpersonal behavior — qualities that are hard to assess through written tests alone. Understanding this purpose is the first step to excelling in GD rounds.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-3">How Are GDs Evaluated?</h2>
          <p className="text-body text-muted-foreground mb-4">
            Evaluators typically score candidates on these parameters:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Content Quality (30%)</h3>
              <p className="text-sm text-muted-foreground">Relevance of points, use of data and examples, depth of analysis, and logical coherence of arguments.</p>
            </Card>
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Communication Skills (25%)</h3>
              <p className="text-sm text-muted-foreground">Clarity of speech, vocabulary, fluency, speaking pace, and absence of filler words.</p>
            </Card>
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Leadership & Initiative (20%)</h3>
              <p className="text-sm text-muted-foreground">Initiating the discussion, steering it back on track, summarizing, and facilitating others' participation.</p>
            </Card>
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Body Language (15%)</h3>
              <p className="text-sm text-muted-foreground">Eye contact, posture, hand gestures, facial expressions, and overall confidence.</p>
            </Card>
            <Card className="p-5 border-2 border-border md:col-span-2">
              <h3 className="font-bold mb-1">Teamwork & Listening (10%)</h3>
              <p className="text-sm text-muted-foreground">Active listening, acknowledging others' points, building on previous arguments, and constructive disagreement.</p>
            </Card>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-3">Step-by-Step GD Preparation Framework</h2>
          <div className="space-y-4">
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Step 1: Build Your Knowledge Base</h3>
              <p className="text-sm text-muted-foreground">Read newspapers daily (The Hindu, Economic Times), follow current affairs apps, and note down key stats and examples for popular GD categories: technology, economy, social issues, and abstract topics.</p>
            </Card>
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Step 2: Learn Argument Frameworks</h3>
              <p className="text-sm text-muted-foreground">Master PREP (Point, Reason, Example, Point) and STAR (Situation, Task, Action, Result) frameworks. These help you structure coherent arguments under pressure.</p>
            </Card>
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Step 3: Improve Communication Skills</h3>
              <p className="text-sm text-muted-foreground">Work on speaking clearly at 120-150 WPM, eliminating filler words, and varying your tone. Practice articulation exercises daily.</p>
            </Card>
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Step 4: Master Body Language</h3>
              <p className="text-sm text-muted-foreground">Practice maintaining eye contact, sitting upright, using controlled hand gestures, and keeping a neutral-to-positive facial expression.</p>
            </Card>
            <Card className="p-5 border-2 border-border">
              <h3 className="font-bold mb-1">Step 5: Practice with Mock GDs</h3>
              <p className="text-sm text-muted-foreground">The most important step. Use GD Buddy to simulate realistic GDs with AI participants. Get scored on all parameters and track improvement over sessions.</p>
            </Card>
          </div>
        </section>

        {/* Hub Links */}
        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-4">Deep Dive into Each Area</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/gd-topics-for-placements" className="block group">
              <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold">📋 GD Topics for Placements</h3>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">50+ curated topics across categories with practice tips.</p>
              </Card>
            </Link>
            <Link to="/how-to-crack-group-discussion" className="block group">
              <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold">🎯 How to Crack GD</h3>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">8 proven tips and strategies for clearing GD rounds.</p>
              </Card>
            </Link>
            <Link to="/common-gd-mistakes" className="block group">
              <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold">⚠️ Common GD Mistakes</h3>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">10 mistakes that cost candidates placements and how to fix them.</p>
              </Card>
            </Link>
            <Link to="/communication-skills-for-gd" className="block group">
              <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold">🗣️ Communication Skills</h3>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">Master verbal, non-verbal, and analytical communication.</p>
              </Card>
            </Link>
            <Link to="/body-language-tips-for-gd" className="block group">
              <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold">🧍 Body Language Tips</h3>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">Non-verbal cues that make or break your GD performance.</p>
              </Card>
            </Link>
            <Link to="/how-to-start-group-discussion" className="block group">
              <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold">🚀 How to Start a GD</h3>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">Opening strategies that create a strong first impression.</p>
              </Card>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-10 text-center border-4 border-border p-8">
          <h2 className="text-h2 font-bold mb-3">Start Practicing with GD Buddy</h2>
          <p className="text-muted-foreground mb-4">GD Buddy is an AI-powered group discussion practice platform. Simulate realistic GDs with AI participants, get scored on content, communication, body language, and more.</p>
          <Button asChild size="lg" className="border-4 border-border">
            <Link to="/home/practice">Start a Free Practice Session</Link>
          </Button>
        </section>

        {/* FAQ */}
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

export default GDPreparationGuide;
