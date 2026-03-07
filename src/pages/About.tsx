import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, BookOpen, Dumbbell, BarChart3,
  Github, Linkedin, Globe, Mail, Sparkles,
} from "lucide-react";
import creatorPhoto from "@/assets/creator-photo.png";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Assisted Practice",
    desc: "Practice group discussions with structured guidance and intelligent insights.",
  },
  {
    icon: BookOpen,
    title: "Curated GD Topics",
    desc: "Access a collection of discussion topics commonly asked in interviews and placements.",
  },
  {
    icon: Dumbbell,
    title: "Skill Drills",
    desc: "Improve communication, articulation, and confidence through targeted practice exercises.",
  },
  {
    icon: BarChart3,
    title: "Progress Dashboard",
    desc: "Track your improvement and identify areas to work on.",
  },
];

const TECH_STACK = [
  "React.js", "Node.js", "JavaScript", "TypeScript",
  "REST APIs", "MongoDB", "AI Integration", "Git & GitHub",
];

const SOCIAL_LINKS = [
  { icon: Github, label: "GitHub", href: "https://github.com/sayandutta" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/in/sayandutta" },
  { icon: Globe, label: "Portfolio", href: "#" },
  { icon: Mail, label: "Email", href: "mailto:sayan@gdbuddy.com" },
];

const About = () => (
  <>
    <SEOHead
      title="About GD Buddy"
      description="Learn about GD Buddy — the AI-powered group discussion practice platform built to help students master communication skills for placements."
      path="/about"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About GD Buddy",
        description: "AI-Powered Group Discussion Practice Platform",
      }}
    />

    <div className="min-h-screen bg-background">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b-4 border-border">
        <div className="container mx-auto px-6 py-20 md:py-28 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-border px-4 py-1.5 mb-6">
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-mono font-bold tracking-widest">ABOUT GD BUDDY</span>
          </div>

          <h1 className="font-bold tracking-tight" style={{ fontSize: "var(--font-size-display)", lineHeight: "var(--line-height-heading)" }}>
            AI-Powered Group Discussion Practice Platform
          </h1>

          <p className="mt-6 text-muted-foreground leading-relaxed" style={{ fontSize: "var(--font-size-body)" }}>
            GD Buddy is a modern SaaS platform designed to help students practice and master group discussions. It combines structured discussion topics, skill drills, and AI-assisted feedback to help users improve communication, critical thinking, and confidence for placements and interviews.
          </p>

          <p className="mt-4 text-xs font-mono text-muted-foreground/70">
            GD Buddy is an experimental AI-assisted learning platform currently under active development.
          </p>
        </div>
      </section>

      {/* ── WHY ── */}
      <section className="container mx-auto px-6 py-16 md:py-20 max-w-3xl">
        <h2 className="font-bold tracking-tight mb-6" style={{ fontSize: "var(--font-size-h1)", lineHeight: "var(--line-height-heading)" }}>
          Why We Built GD Buddy
        </h2>
        <p className="text-muted-foreground leading-relaxed" style={{ fontSize: "var(--font-size-body)" }}>
          Many students struggle with group discussions during placements because they lack structured practice and feedback. GD Buddy was created to solve this problem by providing a dedicated platform where users can practice discussions, explore curated topics, and continuously improve their communication skills in a guided environment.
        </p>
      </section>

      {/* ── FEATURES ── */}
      <section className="border-y-4 border-border bg-secondary/30">
        <div className="container mx-auto px-6 py-16 md:py-20">
          <h2 className="font-bold tracking-tight text-center mb-12" style={{ fontSize: "var(--font-size-h1)", lineHeight: "var(--line-height-heading)" }}>
            Core Features
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                className="border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                    <f.icon className="w-5 h-5 text-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold mb-2" style={{ fontSize: "var(--font-size-h3)" }}>{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILT BY ── */}
      <section className="container mx-auto px-6 py-16 md:py-20">
        <h2 className="font-bold tracking-tight text-center mb-12" style={{ fontSize: "var(--font-size-h1)", lineHeight: "var(--line-height-heading)" }}>
          Built By
        </h2>
        <Card className="max-w-lg mx-auto border-2 overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <img
              src={creatorPhoto}
              alt="Sayan Dutta — Creator of GD Buddy"
              className="w-28 h-28 rounded-full object-cover border-4 border-border mb-6"
              loading="lazy"
            />
            <h3 className="font-bold text-lg">Sayan Dutta</h3>
            <p className="text-sm text-muted-foreground font-mono mt-1">Creator of GD Buddy · Full Stack Developer</p>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-md">
              Sayan Dutta is a final-year Computer Science and Engineering student passionate about building practical AI-powered tools that solve real student problems. GD Buddy was developed to provide a structured and accessible way for students to practice group discussions and build real communication confidence.
            </p>

            {/* Social links */}
            <div className="flex gap-3 mt-6">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors duration-150"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── TECH STACK ── */}
      <section className="border-y-4 border-border bg-secondary/30">
        <div className="container mx-auto px-6 py-16 md:py-20 text-center">
          <h2 className="font-bold tracking-tight mb-8" style={{ fontSize: "var(--font-size-h1)", lineHeight: "var(--line-height-heading)" }}>
            Technology Behind GD Buddy
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {TECH_STACK.map((t) => (
              <Badge key={t} variant="outline" className="px-4 py-1.5 text-sm font-mono border-2">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ── */}
      <section className="container mx-auto px-6 py-16 md:py-20 max-w-3xl text-center">
        <h2 className="font-bold tracking-tight mb-6" style={{ fontSize: "var(--font-size-h1)", lineHeight: "var(--line-height-heading)" }}>
          Our Goal
        </h2>
        <p className="text-muted-foreground leading-relaxed" style={{ fontSize: "var(--font-size-body)" }}>
          Our goal is simple: help students become better communicators. GD Buddy focuses on practical learning through practice, reflection, and structured discussion environments.
        </p>
      </section>

      {/* ── FOOTER NOTE ── */}
      <div className="text-center pb-8 px-6">
        <p className="text-xs font-mono text-muted-foreground/60">
          Built with passion to help students improve communication and succeed in group discussions.
        </p>
      </div>

      <SEOFooter />
    </div>
  </>
);

export default About;
