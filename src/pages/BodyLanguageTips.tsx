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
    headline: "Body Language Tips for Group Discussion",
    description: "Master non-verbal communication for GD rounds. Learn eye contact, posture, gestures, and facial expression techniques that impress evaluators.",
    author: { "@type": "Organization", name: "GD Buddy" },
    publisher: { "@type": "Organization", name: "GD Buddy" },
    datePublished: "2026-03-08T00:00:00+05:30",
    dateModified: "2026-03-08T00:00:00+05:30",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How important is body language in GD?", acceptedAnswer: { "@type": "Answer", text: "Body language accounts for about 15-20% of your GD evaluation. Evaluators assess eye contact, posture, facial expressions, and gestures. Poor body language can undermine even the best verbal contributions." } },
      { "@type": "Question", name: "What body language mistakes should I avoid in GD?", acceptedAnswer: { "@type": "Answer", text: "Avoid crossing arms, slouching, fidgeting, looking down, pointing fingers at others, and excessive hand movements. These signal defensiveness, disinterest, or aggression." } },
      { "@type": "Question", name: "Can I practice body language with AI?", acceptedAnswer: { "@type": "Answer", text: "Yes. GD Buddy uses webcam-based video analysis to track your eye contact, posture, and facial expressions during practice sessions, giving you objective feedback on your body language." } },
      { "@type": "Question", name: "How can I practice GD online with body language feedback?", acceptedAnswer: { "@type": "Answer", text: "GD Buddy's AI group discussion simulator includes real-time video analysis. Enable your webcam during practice to get feedback on eye contact, posture, and facial expressions alongside verbal feedback." } },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://gd-buddy.vercel.app" },
      { "@type": "ListItem", position: 2, name: "Body Language Tips", item: "https://gd-buddy.vercel.app/body-language-tips-for-gd" },
    ],
  },
];

const tips = [
  { title: "Maintain Eye Contact", desc: "Look at the person you're addressing while speaking, then scan the group. When listening, look at the speaker. Avoid staring at the table, ceiling, or your notes. Eye contact signals engagement and confidence.", category: "Eyes" },
  { title: "Sit Upright with Open Posture", desc: "Keep your back straight and lean slightly forward to show interest. Avoid crossing arms or legs — this signals defensiveness. Open posture conveys confidence and receptivity.", category: "Posture" },
  { title: "Use Controlled Hand Gestures", desc: "Moderate hand gestures emphasize points and show energy. Keep movements within your shoulder width. Avoid pointing at others, excessive gesturing, or fidgeting with pens/objects.", category: "Hands" },
  { title: "Nod While Listening", desc: "Gentle nodding shows active listening and acknowledgment. It encourages the speaker and signals to evaluators that you're engaged. But avoid excessive nodding — it can look performative.", category: "Head" },
  { title: "Control Facial Expressions", desc: "Keep a neutral-to-positive expression. Smile when appropriate (greeting, acknowledging a good point). Avoid frowning, eye-rolling, or smirking when you disagree — these are red flags for evaluators.", category: "Face" },
  { title: "Avoid Fidgeting", desc: "Don't tap the table, click pens, touch your face repeatedly, or shift in your seat. These nervous habits distract from your verbal contributions and signal anxiety.", category: "General" },
  { title: "Mirror Positive Group Energy", desc: "Subtly matching the group's energy level builds rapport. If the discussion is energetic, bring energy. If it's analytical, be measured. This shows emotional intelligence and adaptability.", category: "General" },
  { title: "Space and Proximity", desc: "Respect personal space but don't shrink away. Take up an appropriate amount of space at the table. Leaning slightly forward shows interest; leaning back excessively can signal disengagement.", category: "Posture" },
];

const BodyLanguageTips = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="Body Language Tips for Group Discussion"
      description="Master body language for group discussions. Learn eye contact, posture, gesture, and facial expression techniques that impress evaluators in placement GD rounds."
      keywords="body language tips for GD, GD non-verbal communication, eye contact in group discussion, posture for GD, gestures in GD, body language in group discussion"
      path="/body-language-tips-for-gd"
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
          <li aria-current="page">Body Language Tips</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">Body Language Tips for Group Discussion</h1>

        <section className="border-2 border-border p-5 mb-8 bg-muted/30">
          <h2 className="font-bold mb-2">🧍 Quick Summary</h2>
          <p className="text-sm text-muted-foreground mb-3">Body language accounts for 15-20% of GD evaluation. Key areas include eye contact (scan the group while speaking), upright open posture, controlled hand gestures, and positive facial expressions. Avoid crossing arms, fidgeting, and looking down.</p>
          <h3 className="font-bold text-sm mb-1">Key Dos & Don'ts</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>✅ Maintain eye contact, sit upright, nod while listening</li>
            <li>✅ Use moderate hand gestures within shoulder width</li>
            <li>❌ Don't cross arms, fidget, or look at the table</li>
            <li>❌ Don't point at others or make exaggerated expressions</li>
          </ul>
        </section>

        <p className="text-body text-muted-foreground mb-8">
          In group discussions, your body speaks before you do. Evaluators start forming impressions from the moment you sit down. Studies show that <a href="https://en.wikipedia.org/wiki/Nonverbal_communication" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">non-verbal communication</a> can account for over 50% of how a message is received. In GD evaluation, body language specifically contributes to 15-20% of your score. Here are 8 body language techniques to master.
        </p>

        <div className="grid gap-4 mb-10">
          {tips.map((t, i) => (
            <Card key={i} className="p-5 border-2 border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-0.5">{t.category}</span>
                <h2 className="font-bold">{`${i + 1}. ${t.title}`}</h2>
              </div>
              <p className="text-muted-foreground text-sm">{t.desc}</p>
            </Card>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-2">Track Your Body Language with AI</h2>
          <p className="text-body text-muted-foreground mb-4">
            GD Buddy's webcam analysis feature tracks your eye contact percentage, posture score, and facial expressions during practice sessions. Get objective, data-driven feedback on your non-verbal communication — something that's impossible to self-assess accurately.
          </p>
          <Button asChild size="lg" className="border-4 border-border">
            <Link to="/home/practice">Practice with Video Analysis</Link>
          </Button>
        </section>

        <section className="mb-10 border-2 border-border p-5">
          <h2 className="font-bold mb-3">Related Resources</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/communication-skills-for-gd" className="text-muted-foreground hover:text-foreground underline">Communication skills for group discussion →</Link></li>
            <li><Link to="/how-to-speak-confidently-in-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to speak confidently in GD →</Link></li>
            <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground hover:text-foreground underline">Complete GD preparation guide →</Link></li>
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

export default BodyLanguageTips;
