import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Mic, Eye, Brain, HandMetal } from "lucide-react";

const skills = [
  { icon: Mic, title: "Verbal Communication", points: ["Speak clearly and at a moderate pace (120-150 WPM is ideal)", "Use varied vocabulary without being overly complex", "Structure points logically with transitions", "Avoid jargon unless relevant to the topic"] },
  { icon: Eye, title: "Non-Verbal Communication", points: ["Maintain consistent eye contact with the group", "Use open body posture — uncrossed arms, leaning slightly forward", "Nod to acknowledge others' points", "Use hand gestures to emphasize key points"] },
  { icon: Brain, title: "Analytical Thinking", points: ["Break complex topics into components", "Identify cause and effect relationships", "Present balanced perspectives before stating your position", "Use frameworks like PESTLE or SWOT for structured analysis"] },
  { icon: HandMetal, title: "Active Listening", points: ["Build on what others say instead of repeating", "Reference specific points made by other participants", "Ask clarifying questions that add value", "Summarize different viewpoints before concluding"] },
];

const articleJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Communication Skills for Group Discussion",
    description: "Master verbal and non-verbal communication skills for group discussions in placement rounds.",
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
      { "@type": "Question", name: "What communication skills are needed for group discussions?", acceptedAnswer: { "@type": "Answer", text: "Key communication skills include verbal clarity, active listening, body language control, analytical thinking, and the ability to build on others' points constructively." } },
      { "@type": "Question", name: "How can I improve my speaking speed for GDs?", acceptedAnswer: { "@type": "Answer", text: "The ideal speaking speed for GDs is 120-150 words per minute. Practice with GD Buddy, which tracks your WPM in real-time and gives feedback." } },
    ],
  },
];

const CommunicationSkills = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHead
      title="Communication Skills for Group Discussion"
      description="Master verbal and non-verbal communication skills for group discussions. Learn speaking techniques, body language tips, and analytical frameworks for GD rounds."
      keywords="communication skills for GD, how to speak in group discussion, GD body language, verbal skills for placements, soft skills for GD"
      path="/communication-skills-for-gd"
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
          <li aria-current="page">Communication Skills</li>
        </ol>
      </nav>

      <article>
        <h1 className="text-display font-bold mb-4">Communication Skills for Group Discussion</h1>
        <p className="text-body text-muted-foreground mb-8">
          Effective communication is the single most important factor in GD rounds. It's not just about what you say — it's how you say it, how you listen, and how you engage with others. This guide covers the four pillars of communication that evaluators look for in placement GDs.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {skills.map((skill) => (
            <Card key={skill.title} className="p-6 border-4 border-border">
              <div className="flex items-center gap-3 mb-4">
                <skill.icon className="w-8 h-8" aria-hidden="true" />
                <h2 className="text-h2 font-bold">{skill.title}</h2>
              </div>
              <ul className="space-y-2">
                {skill.points.map((pt, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-bold">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-2">How GD Buddy Tracks Your Communication</h2>
          <p className="text-body text-muted-foreground mb-4">
            GD Buddy uses AI to analyze your communication in real-time during practice sessions. It tracks your words per minute, filler word count, eye contact percentage, posture score, and expression analysis — giving you a comprehensive view of your communication strengths and weaknesses. The post-session report includes actionable tips to improve each area.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-h2 font-bold mb-2">Building Communication Skills Over Time</h2>
          <p className="text-body text-muted-foreground mb-4">
            Communication skills improve with consistent practice. Start with solo sessions on GD Buddy, then move to multiplayer mode to practice with friends. Track your progress on the dashboard to see improvements in fluency, confidence, and content quality across sessions.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button asChild size="lg" className="border-4 border-border">
              <Link to="/home/practice">Start Practicing</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-4 border-border">
              <Link to="/gd-topics-for-placements">Browse GD Topics</Link>
            </Button>
          </div>
          <div className="mt-4 flex gap-4 flex-wrap text-sm">
            <Link to="/how-to-crack-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to crack group discussion →</Link>
            <Link to="/common-gd-mistakes" className="text-muted-foreground hover:text-foreground underline">Common GD mistakes to avoid →</Link>
          </div>
        </section>

        <section className="mb-10">
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

export default CommunicationSkills;
