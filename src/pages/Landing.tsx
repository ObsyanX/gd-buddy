import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, BarChart3, Sparkles, Mic, Target, BookOpen, ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "GD Buddy",
  url: typeof window !== "undefined" ? window.location.origin : "https://gdbuddy.lovable.app",
  description: "AI-powered group discussion practice platform for students preparing for campus placements. Simulate realistic GDs with AI participants, get real-time feedback on communication skills, and track improvement over time.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  author: { "@type": "Organization", name: "GD Buddy" },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GD Buddy",
  url: typeof window !== "undefined" ? window.location.origin : "https://gdbuddy.lovable.app",
  logo: typeof window !== "undefined" ? `${window.location.origin}/favicon.ico` : "https://gdbuddy.lovable.app/favicon.ico",
  description: "AI-powered group discussion practice platform for placement preparation.",
  sameAs: [],
};

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        description="Practice group discussions with AI participants, get instant feedback on communication skills, and crack placement GD rounds. Free AI-powered GD simulator for students."
        keywords="GD Buddy, group discussion practice, GD preparation, AI GD simulator, placement preparation tool, communication skills for GD, mock GD online"
        path="/"
        jsonLd={[webAppJsonLd, orgJsonLd]}
      />

      <header className="border-b-4 border-border p-4 md:p-6" role="banner">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-4" aria-label="GD Buddy Home">
            <MessageSquare className="w-8 h-8 md:w-10 md:h-10" aria-hidden="true" />
            <div>
              <span className="text-2xl md:text-4xl font-bold tracking-tight">GD BUDDY</span>
              <p className="text-xs md:text-sm font-mono text-muted-foreground hidden sm:block">AI-POWERED GROUP DISCUSSION PRACTICE</p>
            </div>
          </Link>
          <nav className="hidden md:flex gap-2" aria-label="Main navigation">
            <Button variant="outline" className="border-2" onClick={() => navigate("/auth")} aria-label="Sign in to GD Buddy">
              SIGN IN
            </Button>
            <Button className="border-2" onClick={() => navigate("/auth")} aria-label="Get started with GD Buddy">
              GET STARTED
            </Button>
          </nav>
          <div className="md:hidden flex gap-2">
            <Button size="sm" onClick={() => navigate("/auth")}>GET STARTED</Button>
          </div>
        </div>
      </header>

      <main className="flex-1" role="main">
        {/* Hero */}
        <section className="container mx-auto py-16 md:py-24 px-6 text-center" aria-label="Hero">
          <h1 className="text-display font-bold mb-6 max-w-4xl mx-auto">
            GD Buddy – AI Group Discussion Practice for Placements
          </h1>
          <p className="text-h2 text-muted-foreground max-w-2xl mx-auto mb-8">
            GD Buddy is your AI-powered group discussion practice platform. Simulate realistic placement GDs with intelligent AI participants, get real-time feedback on your communication skills, and build the confidence to ace every GD round.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button size="lg" className="text-xl px-12 py-8 border-4 border-border shadow-md hover:shadow-lg" onClick={() => navigate("/auth")} aria-label="Start practicing group discussions">
              START PRACTICING FREE
            </Button>
            <Button size="lg" variant="outline" className="text-xl px-12 py-8 border-4 border-border" onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }} aria-label="Learn more about GD Buddy features">
              LEARN MORE
            </Button>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto py-16 px-6" aria-label="Key features of GD Buddy">
          <h2 className="text-3xl font-bold text-center mb-12">Why Students Choose GD Buddy for GD Preparation</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <Users className="w-12 h-12" aria-hidden="true" />
              <h3 className="text-xl font-bold">MULTI-PERSONA AI PARTICIPANTS</h3>
              <p className="text-muted-foreground">Discuss with 2–6 AI participants, each with unique personalities, debate styles, and viewpoints — just like a real placement GD round.</p>
            </Card>
            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <Sparkles className="w-12 h-12" aria-hidden="true" />
              <h3 className="text-xl font-bold">REAL-TIME FEEDBACK</h3>
              <p className="text-muted-foreground">Get live coaching on fluency, filler words, speaking pace, argument structure, and body language while you practice.</p>
            </Card>
            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <BarChart3 className="w-12 h-12" aria-hidden="true" />
              <h3 className="text-xl font-bold">DETAILED SESSION REPORTS</h3>
              <p className="text-muted-foreground">Post-session analysis with scores on content quality, communication skills, eye contact, posture, and actionable improvement drills.</p>
            </Card>
            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <Mic className="w-12 h-12" aria-hidden="true" />
              <h3 className="text-xl font-bold">VOICE-BASED DISCUSSION</h3>
              <p className="text-muted-foreground">Speak naturally using your microphone. GD Buddy transcribes your speech in real-time and AI participants respond with realistic voices.</p>
            </Card>
            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <Target className="w-12 h-12" aria-hidden="true" />
              <h3 className="text-xl font-bold">SKILL DRILLS</h3>
              <p className="text-muted-foreground">Practice specific GD skills like opening statements, rebuttals, STAR responses, and time-boxed arguments with targeted drill exercises.</p>
            </Card>
            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <Users className="w-12 h-12" aria-hidden="true" />
              <h3 className="text-xl font-bold">MULTIPLAYER MODE</h3>
              <p className="text-muted-foreground">Practice with friends in real-time. Create a room, share the code, and discuss together alongside AI participants for realistic group dynamics.</p>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto py-16 px-6" aria-label="How GD Buddy works">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">How GD Buddy Works</h2>
            <div className="border-4 border-border p-8 space-y-4">
              <ol className="space-y-4 text-muted-foreground font-mono">
                <li className="flex gap-4"><span className="font-bold text-foreground text-xl">01.</span><span><strong className="text-foreground">Choose a GD topic</strong> — pick from 50+ curated placement topics or let AI generate one for you</span></li>
                <li className="flex gap-4"><span className="font-bold text-foreground text-xl">02.</span><span><strong className="text-foreground">Select AI participants</strong> — customize personas with different debate styles, tones, and expertise</span></li>
                <li className="flex gap-4"><span className="font-bold text-foreground text-xl">03.</span><span><strong className="text-foreground">Start the discussion</strong> — speak naturally, AI participants respond with realistic turn-taking</span></li>
                <li className="flex gap-4"><span className="font-bold text-foreground text-xl">04.</span><span><strong className="text-foreground">Review your report</strong> — get detailed scores on content, communication, body language, and more</span></li>
              </ol>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section className="container mx-auto py-16 px-6" aria-label="Who GD Buddy is for">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Who Is GD Buddy For?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-border">
                <h3 className="font-bold mb-2">🎓 Engineering & MBA Students</h3>
                <p className="text-muted-foreground text-sm">Preparing for campus placements at TCS, Infosys, Wipro, Deloitte, and other top recruiters that conduct GD rounds.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <h3 className="font-bold mb-2">💼 Job Seekers</h3>
                <p className="text-muted-foreground text-sm">Professionals preparing for interviews at companies that use group discussions as part of their hiring process.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <h3 className="font-bold mb-2">🗣️ Public Speaking Enthusiasts</h3>
                <p className="text-muted-foreground text-sm">Anyone looking to improve their communication skills, debate ability, and confidence in group settings.</p>
              </Card>
              <Card className="p-6 border-2 border-border">
                <h3 className="font-bold mb-2">👥 Study Groups</h3>
                <p className="text-muted-foreground text-sm">Friend groups who want to practice GDs together using multiplayer mode with AI participants filling remaining seats.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* GD Preparation Benefits */}
        <section className="container mx-auto py-16 px-6" aria-label="Benefits of practicing with GD Buddy">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Benefits of Practicing GDs with AI</h2>
            <div className="space-y-4">
              <Card className="p-5 border-2 border-border">
                <h3 className="font-bold mb-1">Practice Anytime, Anywhere</h3>
                <p className="text-muted-foreground text-sm">No need to coordinate schedules with friends. Start a practice GD session instantly with AI participants available 24/7.</p>
              </Card>
              <Card className="p-5 border-2 border-border">
                <h3 className="font-bold mb-1">Objective, Unbiased Feedback</h3>
                <p className="text-muted-foreground text-sm">AI doesn't have favorites. Get honest, data-driven feedback on your speaking patterns, body language, and argument quality.</p>
              </Card>
              <Card className="p-5 border-2 border-border">
                <h3 className="font-bold mb-1">Track Progress Over Time</h3>
                <p className="text-muted-foreground text-sm">View session history, compare scores, and identify improvement trends on your dashboard.</p>
              </Card>
              <Card className="p-5 border-2 border-border">
                <h3 className="font-bold mb-1">Build Confidence Before the Real GD</h3>
                <p className="text-muted-foreground text-sm">Familiarity reduces anxiety. The more you practice with realistic AI participants, the more confident you'll feel in actual placement GDs.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Resources / Internal Links */}
        <section className="container mx-auto py-16 px-6" aria-label="GD preparation resources">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">GD Preparation Resources</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link to="/gd-topics-for-placements" className="block group">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold">📋 GD Topics for Placements 2025</h3>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground">50+ curated group discussion topics across current affairs, business, technology, and abstract categories.</p>
                </Card>
              </Link>
              <Link to="/how-to-crack-group-discussion" className="block group">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold">🎯 How to Crack Group Discussion</h3>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground">Proven tips and strategies for initiating, contributing, and summarizing in placement GD rounds.</p>
                </Card>
              </Link>
              <Link to="/common-gd-mistakes" className="block group">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold">⚠️ Common GD Mistakes to Avoid</h3>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground">10 critical mistakes that cost students their placements and how to fix them before the real GD.</p>
                </Card>
              </Link>
              <Link to="/communication-skills-for-gd" className="block group">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold">🗣️ Communication Skills for GD</h3>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground">Master verbal, non-verbal, and analytical communication for group discussions.</p>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto py-16 px-6 text-center" aria-label="Get started">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Crack Your Next GD?</h2>
            <p className="text-muted-foreground mb-8">Join thousands of students using GD Buddy to prepare for placement group discussions. Start your first practice session in under a minute.</p>
            <Button size="lg" className="text-xl px-12 py-8 border-4 border-border shadow-md hover:shadow-lg" onClick={() => navigate("/auth")}>
              GET STARTED FREE
            </Button>
          </div>
        </section>
      </main>

      <SEOFooter />
    </div>
  );
};

export default Landing;
