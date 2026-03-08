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
    headline: "How to Conclude a GD Round — Summarization Techniques",
    description: "Learn how to effectively conclude and summarize a group discussion in placement rounds. Closing strategies that leave a lasting impression on evaluators.",
    author: { "@type": "Organization", name: "GD Buddy" },
    publisher: { "@type": "Organization", name: "GD Buddy" },
    datePublished: "2026-03-08T00:00:00+05:30",
    dateModified: "2026-03-08T00:00:00+05:30",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Who should conclude a group discussion?", acceptedAnswer: { "@type": "Answer", text: "Anyone who has been listening actively and can summarize all viewpoints fairly. The concluder doesn't need to be the person who started the discussion. Taking charge of summarizing shows leadership and listening skills." } },
      { "@type": "Question", name: "What should a GD conclusion include?", acceptedAnswer: { "@type": "Answer", text: "A good GD conclusion should: 1) Acknowledge key points from all sides, 2) Present the majority consensus (if any), 3) Offer a balanced perspective, and 4) End with a forward-looking statement." } },
      { "@type": "Question", name: "How long should a GD summary be?", acceptedAnswer: { "@type": "Answer", text: "Keep your summary to 45-60 seconds. Cover the main arguments from all sides, note the consensus, and end with a brief personal stance or call to action." } },
      { "@type": "Question", name: "How can I practice GD summarization online?", acceptedAnswer: { "@type": "Answer", text: "Use GD Buddy's AI group discussion simulator to practice full GD sessions including conclusions. The AI provides feedback on how well you summarized the discussion." } },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://gd-buddy.vercel.app" },
      { "@type": "ListItem", position: 2, name: "GD Preparation", item: "https://gd-buddy.vercel.app/group-discussion-preparation-guide" },
      { "@type": "ListItem", position: 3, name: "Conclude GD", item: "https://gd-buddy.vercel.app/how-to-conclude-gd-round" },
    ],
  },
];

const techniques = [
  { title: "Summarize All Perspectives", desc: "A great conclusion captures all sides of the debate. Say something like: 'We discussed three key perspectives — those who favored [X] because of [reason], those who opposed it citing [reason], and a middle ground suggesting [approach].' This shows active listening." },
  { title: "Identify the Consensus", desc: "If the group reached a general agreement, highlight it: 'While there were differing views, most of us agreed that [consensus point].' If there was no consensus, acknowledge the healthy debate." },
  { title: "Add Your Balanced View", desc: "After summarizing others, briefly add your own balanced perspective: 'I believe the way forward is a combination of [approach A] and [approach B], as both have merit.' This shows analytical maturity." },
  { title: "End with a Forward-Looking Statement", desc: "Close with an actionable or thought-provoking statement: 'This is clearly a topic that will continue to evolve, and as future professionals, we'll need to adapt to these changes.' Avoid cliché endings." },
  { title: "Use Signposting Language", desc: "Start your summary with clear signals: 'To conclude our discussion...', 'Let me bring together the key points...', 'In summary, the group covered three main areas...' This tells the group and evaluators you're taking the summarizer role." },
  { title: "Reference Specific Contributions", desc: "Mentioning specific points made by others shows excellent listening: 'As [participant] mentioned, the economic angle is important, and building on [another participant's] point about social impact...' This impresses evaluators." },
];

const ConcludeGD = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="How to Conclude a GD Round"
      description="Learn how to effectively conclude and summarize a group discussion. 6 closing strategies that leave a lasting impression on evaluators in placement GD rounds."
      keywords="how to conclude GD, GD summarization, group discussion conclusion, how to summarize GD, closing a group discussion, GD conclusion tips"
      path="/how-to-conclude-gd-round"
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
          <li aria-current="page">Conclude GD</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">How to Conclude a GD Round — 6 Summarization Techniques</h1>

        <section className="border-2 border-border p-5 mb-8 bg-muted/30">
          <h2 className="font-bold mb-2">📝 Quick Summary</h2>
          <p className="text-sm text-muted-foreground mb-3">Concluding a GD is as impactful as starting one. A strong summary captures all viewpoints, identifies consensus, and ends with a forward-looking statement. Keep it to 45-60 seconds. The summarizer must have been listening actively throughout.</p>
          <h3 className="font-bold text-sm mb-1">Key Takeaways</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Summarize all perspectives, not just your own</li>
            <li>Reference specific points made by other participants</li>
            <li>End with a forward-looking or actionable statement</li>
            <li>Use signposting language to claim the summarizer role</li>
          </ul>
        </section>

        <p className="text-body text-muted-foreground mb-8">
          Many candidates focus on starting the discussion but forget that concluding it is equally powerful. A well-delivered summary demonstrates leadership, active listening, and the ability to synthesize multiple viewpoints — all qualities that evaluators look for in placement GD rounds. Here are 6 techniques to conclude a GD effectively.
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
            <Link to="/home/practice">Practice Summarizing in AI GD</Link>
          </Button>
        </section>

        <section className="mb-10 border-2 border-border p-5">
          <h2 className="font-bold mb-3">Related Resources</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/how-to-start-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to start a group discussion →</Link></li>
            <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground hover:text-foreground underline">Complete GD preparation guide →</Link></li>
            <li><Link to="/communication-skills-for-gd" className="text-muted-foreground hover:text-foreground underline">Communication skills for GD →</Link></li>
            <li><Link to="/how-to-crack-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to crack group discussion →</Link></li>
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

export default ConcludeGD;
