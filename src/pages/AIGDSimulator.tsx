import { Link, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Mic, BarChart3, Users, Sparkles, Eye, Target } from "lucide-react";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GD Buddy AI GD Simulator",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description: "AI-powered group discussion simulator that helps students practice GD rounds with realistic AI participants and get instant feedback on communication skills, body language, and argument quality.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    author: { "@type": "Organization", name: "GD Buddy" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is an AI GD simulator?", acceptedAnswer: { "@type": "Answer", text: "An AI GD simulator is a software that creates realistic group discussion environments using AI participants. GD Buddy's simulator uses multiple AI personas with different debate styles, tones, and expertise to mimic real placement GD rounds." } },
      { "@type": "Question", name: "How realistic is the AI simulation?", acceptedAnswer: { "@type": "Answer", text: "GD Buddy uses advanced AI models to generate contextual, nuanced responses. AI participants interrupt, agree, disagree, and build on points naturally — simulating real human group dynamics." } },
      { "@type": "Question", name: "What feedback do I get after a session?", acceptedAnswer: { "@type": "Answer", text: "You receive a detailed report with scores on content quality, communication clarity, fluency, filler word count, speaking pace, eye contact, posture, and actionable improvement tips." } },
      { "@type": "Question", name: "Is the AI GD simulator free?", acceptedAnswer: { "@type": "Answer", text: "Yes, GD Buddy is completely free to use. You can practice unlimited GD sessions with AI participants at no cost." } },
      { "@type": "Question", name: "Is there an AI tool for group discussion practice?", acceptedAnswer: { "@type": "Answer", text: "Yes! GD Buddy is a free AI-powered group discussion practice platform. It simulates realistic GD rounds with AI participants, provides real-time feedback, and helps you prepare for campus placements." } },
      { "@type": "Question", name: "How can I practice GD online?", acceptedAnswer: { "@type": "Answer", text: "You can practice GD online using GD Buddy's AI simulator. Choose a topic, select AI participants, and start speaking — the AI responds in real-time just like a real group discussion." } },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://gd-buddy.vercel.app" },
      { "@type": "ListItem", position: 2, name: "AI GD Simulator", item: "https://gd-buddy.vercel.app/ai-gd-simulator" },
    ],
  },
];

const AIGDSimulator = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="AI GD Simulator – Practice Group Discussions"
        description="Free AI-powered group discussion simulator. Practice GD rounds with realistic AI participants, get instant feedback on communication skills, and prepare for placements."
        keywords="AI GD simulator, online GD practice, group discussion simulator, mock GD online, AI group discussion practice"
        path="/ai-gd-simulator"
        jsonLd={jsonLd}
      />
      <header className="border-b-4 border-border p-4 md:p-6">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Go to homepage">
            <MessageSquare className="w-8 h-8" />
            <span className="text-2xl font-bold">GD BUDDY</span>
          </Link>
          <Button onClick={() => navigate("/auth")}>GET STARTED</Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto py-16 md:py-24 px-6 text-center">
          <h1 className="text-display font-bold mb-6 max-w-4xl mx-auto">
            Practice Group Discussions with AI Participants
          </h1>
          <p className="text-h2 text-muted-foreground max-w-2xl mx-auto mb-8">
            GD Buddy's AI simulator creates realistic placement GD rounds with intelligent participants who debate, challenge, and respond to your arguments in real-time. Get scored on everything evaluators look for.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button size="lg" className="text-xl px-12 py-8 border-4 border-border" onClick={() => navigate("/auth")}>
              TRY THE SIMULATOR FREE
            </Button>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">How the AI Simulator Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 border-4 border-border text-center">
                <div className="text-4xl font-bold mb-3">01</div>
                <h3 className="font-bold mb-2">Choose Your Setup</h3>
                <p className="text-sm text-muted-foreground">Pick a GD topic, select 2-6 AI participants, and customize their debate styles and expertise levels.</p>
              </Card>
              <Card className="p-6 border-4 border-border text-center">
                <div className="text-4xl font-bold mb-3">02</div>
                <h3 className="font-bold mb-2">Discuss Naturally</h3>
                <p className="text-sm text-muted-foreground">Speak using your microphone. AI participants listen, respond, and interact with realistic turn-taking and varied perspectives.</p>
              </Card>
              <Card className="p-6 border-4 border-border text-center">
                <div className="text-4xl font-bold mb-3">03</div>
                <h3 className="font-bold mb-2">Get Your Report</h3>
                <p className="text-sm text-muted-foreground">Receive detailed scores on content, communication, fluency, body language, and actionable improvement suggestions.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">What Makes This Simulator Different</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-border">
                <Users className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-2">Multi-Persona AI Participants</h3>
                <p className="text-sm text-muted-foreground">Each AI participant has a unique personality, debate style, and viewpoint. They agree, disagree, interrupt, and build on arguments like real candidates.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <Mic className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-2">Voice-Based Interaction</h3>
                <p className="text-sm text-muted-foreground">Speak naturally using your microphone. Real-time speech-to-text transcription and AI voices create an immersive discussion experience.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <BarChart3 className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-2">Comprehensive Scoring</h3>
                <p className="text-sm text-muted-foreground">Get scored on content quality, fluency, filler words, speaking pace, argument structure, and more — just like real evaluators.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <Eye className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-2">Video Analysis</h3>
                <p className="text-sm text-muted-foreground">Optional webcam analysis tracks eye contact, posture, and facial expressions — the non-verbal cues that matter in GDs.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <Sparkles className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-2">Real-Time Coaching</h3>
                <p className="text-sm text-muted-foreground">Get live tips during the discussion on when to speak, when to listen, and how to improve your delivery.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <Target className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-2">Targeted Skill Drills</h3>
                <p className="text-sm text-muted-foreground">Practice specific skills like opening statements, rebuttals, STAR responses, and time-boxed arguments with focused drill exercises.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto py-16 px-6 text-center">
          <div className="max-w-2xl mx-auto border-4 border-border p-8">
            <h2 className="text-3xl font-bold mb-4">Ready to Practice?</h2>
            <p className="text-muted-foreground mb-6">Start your first AI-simulated group discussion in under a minute. No payment required.</p>
            <Button size="lg" className="text-xl px-12 py-8 border-4 border-border" onClick={() => navigate("/auth")}>
              START PRACTICING FREE
            </Button>
          </div>
        </section>

        {/* Related */}
        <section className="container mx-auto py-8 px-6 max-w-4xl">
          <div className="border-2 border-border p-5">
            <h2 className="font-bold mb-3">Related Resources</h2>
            <ul className="space-y-2 text-sm">
              <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground hover:text-foreground underline">Complete GD preparation guide →</Link></li>
              <li><Link to="/gd-topics-for-placements" className="text-muted-foreground hover:text-foreground underline">50+ GD topics for placements →</Link></li>
              <li><Link to="/how-to-crack-group-discussion" className="text-muted-foreground hover:text-foreground underline">How to crack group discussion →</Link></li>
              <li><Link to="/common-gd-mistakes" className="text-muted-foreground hover:text-foreground underline">Common GD mistakes to avoid →</Link></li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto py-8 px-6 max-w-4xl">
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
      </main>

      <SEOFooter />
    </div>
  );
};

export default AIGDSimulator;
