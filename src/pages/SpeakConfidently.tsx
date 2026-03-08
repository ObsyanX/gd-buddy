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
    headline: "How to Speak Confidently in Group Discussion",
    description: "Practical techniques to overcome nervousness, build confidence, and speak assertively in placement GD rounds.",
    author: { "@type": "Organization", name: "GD Buddy" },
    publisher: { "@type": "Organization", name: "GD Buddy" },
    datePublished: "2026-03-08T00:00:00+05:30",
    dateModified: "2026-03-08T00:00:00+05:30",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Why do I feel nervous in group discussions?", acceptedAnswer: { "@type": "Answer", text: "Nervousness in GDs comes from fear of judgment, lack of preparation, and unfamiliarity with group speaking. Regular mock practice reduces anxiety significantly." } },
      { "@type": "Question", name: "How can I speak more confidently in a GD?", acceptedAnswer: { "@type": "Answer", text: "Prepare talking points in advance, practice with mock GDs, focus on slow breathing, maintain eye contact, and start with simple points before building to complex arguments." } },
      { "@type": "Question", name: "Does practicing with AI help build GD confidence?", acceptedAnswer: { "@type": "Answer", text: "Yes. AI-simulated GDs let you practice in a judgment-free environment. The more you practice, the more comfortable you become with group speaking dynamics." } },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://gd-buddy.vercel.app" },
      { "@type": "ListItem", position: 2, name: "GD Preparation", item: "https://gd-buddy.vercel.app/group-discussion-preparation-guide" },
      { "@type": "ListItem", position: 3, name: "Speak Confidently", item: "https://gd-buddy.vercel.app/how-to-speak-confidently-in-group-discussion" },
    ],
  },
];

const techniques = [
  { title: "Prepare Key Talking Points", desc: "Before any GD, note 3-5 key arguments with supporting data. Having a mental framework reduces anxiety because you know you have something valuable to say." },
  { title: "Start with Simple Contributions", desc: "You don't need to make the most profound point first. Start by agreeing or extending someone else's point. This builds momentum and eases you into speaking." },
  { title: "Use the Power Pause", desc: "Instead of rushing to fill silence with fillers, take a brief 1-2 second pause before speaking. This projects confidence and gives you time to organize your thoughts." },
  { title: "Maintain Eye Contact", desc: "Look at the group, not the table. Making eye contact with participants shows confidence and engagement. Rotate your gaze across the group while speaking." },
  { title: "Control Your Breathing", desc: "Slow, deep breaths before and during the GD lower your heart rate and reduce anxiety. Practice box breathing: inhale 4 seconds, hold 4, exhale 4, hold 4." },
  { title: "Speak Slowly and Clearly", desc: "Nervous speakers tend to rush. Consciously slow down to 120-140 WPM. Clarity beats speed in GD evaluation." },
  { title: "Reframe Nervousness as Excitement", desc: "Research shows that telling yourself 'I'm excited' instead of 'I'm nervous' improves performance. Both emotions have similar physical symptoms — reframe them positively." },
  { title: "Practice Consistently", desc: "Confidence comes from familiarity. The more GDs you practice, the more natural it feels. GD Buddy's AI simulation lets you practice unlimited sessions at your own pace." },
];

const SpeakConfidently = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="How to Speak Confidently in Group Discussion"
      description="Learn practical techniques to speak confidently in group discussions. Overcome nervousness, build assertiveness, and make a strong impression in placement GD rounds."
      keywords="how to speak confidently in GD, confidence in group discussion, overcome nervousness in GD, GD speaking tips, assertive speaking in GD"
      path="/how-to-speak-confidently-in-group-discussion"
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
          <li aria-current="page">Speak Confidently</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">How to Speak Confidently in Group Discussion</h1>

        <section className="border-2 border-border p-5 mb-8 bg-muted/30">
          <h2 className="font-bold mb-2">💪 Quick Summary</h2>
          <p className="text-sm text-muted-foreground mb-3">Confidence in GDs comes from preparation, practice, and technique. Key strategies include preparing talking points in advance, using power pauses instead of fillers, maintaining eye contact, controlling breathing, and practicing regularly with mock GDs.</p>
          <h3 className="font-bold text-sm mb-1">Top Tips</h3>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Prepare 3-5 key arguments before the GD</li>
            <li>Use 1-2 second power pauses instead of fillers</li>
            <li>Speak at 120-140 WPM — clarity over speed</li>
            <li>Reframe nervousness as excitement</li>
            <li>Practice regularly with <Link to="/ai-gd-simulator" className="underline hover:text-foreground">AI simulation</Link></li>
          </ol>
        </section>

        <p className="text-body text-muted-foreground mb-8">
          Confidence is the #1 differentiator between candidates who clear GD rounds and those who don't. Many students have great ideas but fail to express them because of nervousness, hesitation, or self-doubt. The good news? Confidence is a skill that can be built through practice and the right techniques. Here are 8 proven strategies.
        </p>

        <div className="grid gap-4 mb-10">
          {techniques.map((t, i) => (
            <Card key={i} className="p-5 border-2 border-border">
              <h2 className="font-bold mb-1">{`${i + 1}. ${t.title}`}</h2>
              <p className="text-muted-foreground text-sm">{t.desc}</p>
            </Card>
          ))}
        </div>

        <section className="mb-10">
          <Button asChild size="lg" className="border-4 border-border">
            <Link to="/home/practice">Practice Speaking with AI</Link>
          </Button>
        </section>

        <section className="mb-10 border-2 border-border p-5">
          <h2 className="font-bold mb-3">Related Resources</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground hover:text-foreground underline">Complete GD preparation guide →</Link></li>
            <li><Link to="/communication-skills-for-gd" className="text-muted-foreground hover:text-foreground underline">Communication skills for GD →</Link></li>
            <li><Link to="/body-language-tips-for-gd" className="text-muted-foreground hover:text-foreground underline">Body language tips for GD →</Link></li>
            <li><Link to="/how-to-start-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to start a group discussion →</Link></li>
            <li><Link to="/common-gd-mistakes" className="text-muted-foreground hover:text-foreground underline">Common GD mistakes to avoid →</Link></li>
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

export default SpeakConfidently;
