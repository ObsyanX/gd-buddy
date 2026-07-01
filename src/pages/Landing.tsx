import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Users, BarChart3, Sparkles, Mic, Target,
  ArrowRight, Radar, Waves, Trophy, Play, Zap,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { fadeRise, stagger, wordRise } from "@/lib/motion";

const LANDING_FAQS = [
  { q: "What is GD Buddy?", a: "GD Buddy is a free AI-powered platform that lets students practice group discussions with realistic AI participants, get real-time feedback on communication skills, and prepare for placement GD rounds." },
  { q: "Is GD Buddy free to use?", a: "Yes. GD Buddy is completely free. You can start practicing group discussions instantly after signing up." },
  { q: "How does the AI simulate a real group discussion?", a: "GD Buddy uses multiple AI personas with distinct debate styles, tones, and viewpoints. They respond to your arguments in real-time with realistic turn-taking, just like a real placement GD." },
  { q: "What kind of feedback does GD Buddy provide?", a: "You receive detailed post-session reports covering content quality, fluency, filler word count, speaking pace, argument structure, eye contact, posture, and actionable improvement suggestions." },
  { q: "Can I practice with friends?", a: "Yes! GD Buddy has a multiplayer mode where you can create a room, share a code with friends, and practice together alongside AI participants." },
  { q: "Who is GD Buddy for?", a: "GD Buddy is designed for engineering and MBA students preparing for campus placements, job seekers, public speaking enthusiasts, and study groups who want structured GD practice." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQS.map(f => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "GD Buddy",
  alternateName: ["Group Discussion Buddy", "AI Group Discussion Practice Tool", "GD Practice Platform"],
  url: typeof window !== "undefined" ? window.location.origin : "https://gd-buddy.vercel.app",
  description: "AI-powered group discussion practice platform for students preparing for campus placements.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  author: { "@type": "Organization", name: "GD Buddy" },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GD Buddy",
  alternateName: ["Group Discussion Buddy", "GD Buddy AI"],
  url: typeof window !== "undefined" ? window.location.origin : "https://gd-buddy.vercel.app",
  logo: typeof window !== "undefined" ? `${window.location.origin}/og-image.png` : "https://gd-buddy.vercel.app/og-image.png",
  description: "AI-powered group discussion practice platform for placement preparation.",
  sameAs: ["https://github.com/ObsyanX", "https://www.linkedin.com/in/sayan-dutta-exceptional98/"],
};

const BENTO = [
  { icon: Users, title: "Multi-persona AI", body: "Debate with 2–6 AI participants — each with a distinct temperament, tempo, and viewpoint.", span: "md:col-span-2 md:row-span-2", accent: true },
  { icon: Radar, title: "Radar analytics", body: "Post-session scores on content, fluency, structure, empathy and leadership.", span: "" },
  { icon: Sparkles, title: "Live coaching", body: "Real-time nudges on pace, fillers, and clarity while you speak.", span: "" },
  { icon: Waves, title: "Voice fidelity", body: "Natural microphone flow with turn-taking that never feels robotic.", span: "md:col-span-2" },
  { icon: Trophy, title: "Achievements", body: "XP, streaks, and badges that reward the craft, not just the effort.", span: "" },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative">
      <SEOHead
        description="GD Buddy (Group Discussion Buddy) — practice group discussions with AI participants. Free AI GD simulator for placement preparation."
        keywords="group discussion buddy, GD Buddy, group discussion practice, AI group discussion practice, GD practice online, group discussion simulator"
        path="/"
        jsonLd={[webAppJsonLd, orgJsonLd, faqJsonLd]}
      />

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="ambient-orb w-[52vw] h-[52vw] -top-[15%] -left-[10%]" style={{ background: "hsl(29 60% 45% / 0.55)" }} />
        <div className="ambient-orb w-[46vw] h-[46vw] top-[10%] -right-[10%]" style={{ background: "hsl(12 55% 40% / 0.45)", animationDelay: "3s" }} />
        <div className="ambient-orb w-[38vw] h-[38vw] bottom-[-15%] left-[20%]" style={{ background: "hsl(36 68% 40% / 0.35)", animationDelay: "6s" }} />
      </div>

      {/* Header */}
      <header className="relative z-20" role="banner">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="glass rounded-full px-4 md:px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group" aria-label="GD Buddy Home">
              <div className="w-9 h-9 rounded-xl bg-gradient-copper flex items-center justify-center shadow-copper group-hover:rotate-6 transition-transform duration-slow ease-editorial">
                <MessageSquare className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <div>
                <span className="font-display text-xl md:text-2xl tracking-tight text-foreground">GD Buddy</span>
                <p className="text-micro text-muted-foreground hidden md:block">Editorial GD practice</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground" aria-label="Main navigation">
              <a href="#features" className="story-link hover:text-foreground transition-colors">Features</a>
              <Link to="/gd-topics-for-placements" className="story-link hover:text-foreground transition-colors">Topics</Link>
              <Link to="/about" className="story-link hover:text-foreground transition-colors">About</Link>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">Sign in</Button>
              <Button variant="premium" size="sm" onClick={() => navigate("/auth")}>
                Start free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10" role="main">
        {/* HERO — cinematic split */}
        <section className="container mx-auto px-4 md:px-6 pt-8 md:pt-16 pb-16" aria-label="Hero">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger(0.1, 0.12)}
            className="glass-strong rounded-[2.5rem] overflow-hidden shadow-premium"
          >
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 p-8 md:p-12 lg:p-16 items-center">
              {/* Left content */}
              <div className="space-y-8">
                <motion.div variants={fadeRise} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-micro text-primary-glow">Live practice rooms open</span>
                </motion.div>

                <h1 className="text-display font-display leading-[0.95]">
                  <span className="block overflow-hidden">
                    <motion.span variants={wordRise} className="block">Speak.</motion.span>
                  </span>
                  <span className="block overflow-hidden">
                    <motion.span variants={wordRise} className="block italic-accent copper-text">Lead.</motion.span>
                  </span>
                  <span className="block overflow-hidden">
                    <motion.span variants={wordRise} className="block ember-text">Conquer.</motion.span>
                  </span>
                </h1>

                <motion.p variants={fadeRise} className="text-lg text-muted-foreground max-w-md leading-relaxed">
                  Master group discussions with multi-persona AI, real-time coaching, and radar-grade analytics —
                  crafted for placement rounds that reward the poised.
                </motion.p>

                <motion.div variants={fadeRise} className="flex flex-wrap gap-3">
                  <Button variant="premium" size="lg" onClick={() => navigate("/auth")} aria-label="Start practicing GD">
                    Enter a room
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button variant="glass" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                    <Play className="w-4 h-4" /> Explore features
                  </Button>
                </motion.div>

                <motion.div variants={fadeRise} className="flex items-center gap-4 pt-2">
                  <div className="flex -space-x-3">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-secondary/60" />
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-background bg-gradient-copper flex items-center justify-center text-micro text-primary-foreground">+2k</div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">2,400+ students</span> practicing now
                  </p>
                </motion.div>
              </div>

              {/* Right — live session preview */}
              <motion.div variants={fadeRise} className="relative">
                <div className="absolute -inset-8 bg-gradient-glow opacity-70 blur-3xl -z-10" aria-hidden="true" />
                <div className="glass-strong rounded-3xl p-6 md:p-7 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-micro text-muted-foreground">Session · GD-992</span>
                    <span className="text-micro px-2 py-1 rounded-full bg-primary/15 text-primary-glow">Recording</span>
                  </div>

                  {/* Participant grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { name: "You", speaking: true },
                      { name: "Aisha AI", speaking: false },
                      { name: "Kenji AI", speaking: false },
                      { name: "Priya AI", speaking: false },
                    ].map((p) => (
                      <div key={p.name} className={`aspect-video relative rounded-2xl glass-subtle overflow-hidden ${p.speaking ? "ring-2 ring-primary/60 copper-glow" : ""}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/5" />
                        <div className="absolute bottom-2 left-2 flex items-center gap-2 text-micro text-foreground/80">
                          {p.name}
                        </div>
                        {p.speaking && (
                          <div className="absolute top-2 right-2 flex items-end gap-0.5 h-4">
                            {[0,1,2].map(i => (
                              <span
                                key={i}
                                className="w-1 bg-primary-glow rounded-full origin-bottom animate-bar-wave"
                                style={{ height: "100%", animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Analytics bar */}
                  <div className="glass-subtle rounded-2xl p-4">
                    <div className="flex justify-between text-micro mb-2">
                      <span className="text-muted-foreground">Speech quality</span>
                      <span className="text-primary-glow">84% · clear</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-copper rounded-full"
                        style={{
                          width: "84%",
                          backgroundImage: "linear-gradient(90deg, hsl(29 60% 50%), hsl(36 68% 70%), hsl(29 60% 50%))",
                          backgroundSize: "200% 100%",
                          animation: "copper-shimmer 3s linear infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border/60">
              {[
                { k: "500+", v: "Daily rooms" },
                { k: "12ms", v: "Avg latency" },
                { k: "AI-led", v: "Moderation" },
                { k: "150+", v: "GD topics" },
              ].map((s) => (
                <div key={s.v} className="p-6 text-center border-r last:border-r-0 border-border/60">
                  <div className="font-display text-2xl md:text-3xl copper-text">{s.k}</div>
                  <div className="text-micro text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* BENTO features */}
        <section id="features" className="container mx-auto px-4 md:px-6 py-16" aria-label="Features">
          <div className="max-w-3xl mb-10">
            <p className="text-micro text-primary-glow mb-4">Features · Craftsmanship</p>
            <h2 className="text-h1 font-display leading-tight">
              A GD room that <span className="italic-accent copper-text">rewards precision</span> — not volume.
            </h2>
          </div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger(0, 0.09)}
            className="grid md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-5 auto-rows-[minmax(180px,auto)]"
          >
            {BENTO.map((tile) => (
              <motion.div
                key={tile.title}
                variants={fadeRise}
                whileHover={{ y: -6 }}
                className={`glass rounded-3xl p-6 md:p-7 relative overflow-hidden group ${tile.span}`}
              >
                {tile.accent && (
                  <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-copper opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
                )}
                <div className="relative flex flex-col h-full gap-4">
                  <div className="w-11 h-11 rounded-2xl glass-subtle flex items-center justify-center">
                    <tile.icon className="w-5 h-5 text-primary-glow" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-h3 mb-2">{tile.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tile.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Editorial process strip */}
        <section className="container mx-auto px-4 md:px-6 py-16" aria-label="How it works">
          <div className="glass-strong rounded-[2.5rem] p-8 md:p-12">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
              <h2 className="text-h1 font-display">
                Four moves. <span className="italic-accent copper-text">One rehearsal.</span>
              </h2>
              <span className="text-micro text-muted-foreground">The GD Buddy method</span>
            </div>
            <ol className="grid md:grid-cols-4 gap-6">
              {[
                { n: "01", t: "Choose a topic", d: "Pick from 150+ curated placement prompts or ask AI for one." },
                { n: "02", t: "Assemble the room", d: "Balance personas — the skeptic, the empath, the analyst." },
                { n: "03", t: "Speak the case", d: "Turn-taking, coaching, and pacing feedback in real time." },
                { n: "04", t: "Read the radar", d: "Score cards on clarity, empathy, structure, leadership." },
              ].map((s) => (
                <li key={s.n} className="space-y-3">
                  <div className="text-micro text-primary-glow">{s.n}</div>
                  <h3 className="font-display text-h3">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Resources */}
        <section className="container mx-auto px-4 md:px-6 py-16" aria-label="GD preparation resources">
          <div className="max-w-2xl mb-10">
            <p className="text-micro text-primary-glow mb-4">Library</p>
            <h2 className="text-h1 font-display">
              Read <span className="italic-accent copper-text">before you rehearse.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: "/gd-topics-for-placements", t: "GD Topics 2025", d: "150+ topics across current affairs, business, tech, abstract." },
              { to: "/how-to-crack-group-discussion", t: "How to crack GD", d: "Initiate, contribute, and summarize with intent." },
              { to: "/common-gd-mistakes", t: "Common mistakes", d: "10 GD errors that cost placements — and how to fix them." },
              { to: "/communication-skills-for-gd", t: "Communication", d: "Verbal, non-verbal, analytical craft for GD rounds." },
            ].map((r) => (
              <Link key={r.to} to={r.to} className="group">
                <div className="glass rounded-3xl p-6 h-full hover-lift">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display text-h3">{r.t}</h3>
                    <ArrowRight className="w-4 h-4 text-primary-glow opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground">{r.d}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 md:px-6 py-16" aria-label="Frequently asked questions">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-micro text-primary-glow mb-4">Frequent questions</p>
              <h2 className="text-h1 font-display">Answers, <span className="italic-accent copper-text">clarified.</span></h2>
            </div>
            <div className="space-y-3">
              {LANDING_FAQS.map((faq) => (
                <details key={faq.q} className="glass rounded-2xl p-5 group">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                    <span className="font-display text-h3">{faq.q}</span>
                    <span className="w-8 h-8 rounded-full glass-subtle flex items-center justify-center text-primary-glow group-open:rotate-45 transition-transform duration-normal">+</span>
                  </summary>
                  <p className="mt-4 text-muted-foreground leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 md:px-6 py-16" aria-label="Call to action">
          <div className="glass-strong rounded-[2.5rem] p-8 md:p-16 text-center relative overflow-hidden">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[80%] h-96 bg-gradient-copper opacity-20 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <p className="text-micro text-primary-glow mb-4">The rehearsal</p>
              <h2 className="text-display font-display leading-[0.95] mb-6 max-w-3xl mx-auto">
                Your <span className="italic-accent copper-text">first room</span> is one click away.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Free forever. No credit card. Real-time AI participants, editorial analytics.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="premium" size="xl" onClick={() => navigate("/auth")}>
                  Start practicing
                  <Zap className="w-4 h-4" />
                </Button>
                <Button variant="glass" size="xl" onClick={() => navigate("/ai-gd-simulator")}>
                  Try the simulator
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SEOFooter />
    </div>
  );
};

export default Landing;
