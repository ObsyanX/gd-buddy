import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Users, BarChart3, Sparkles, Mic, Target,
  ArrowRight, Radar, Waves, Trophy, Play, Zap, Compass, Feather, Gauge, Quote, Star,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { fadeRise, stagger, wordRise } from "@/lib/motion";

/* ─── Decorative SVGs ───────────────────────────────────────────── */
const DotGrid = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="200" height="200" viewBox="0 0 200 200" fill="none" aria-hidden="true">
    <defs>
      <pattern id="dotgrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.2" fill="currentColor" />
      </pattern>
    </defs>
    <rect width="200" height="200" fill="url(#dotgrid)" />
  </svg>
);

const RadarRings = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 240 240" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="radarFade" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
    {[30, 60, 90, 115].map((r, i) => (
      <circle key={r} cx="120" cy="120" r={r} stroke="currentColor" strokeOpacity={0.25 - i * 0.04} strokeWidth="1" fill="none" />
    ))}
    <motion.g
      style={{ originX: "120px", originY: "120px" }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
    >
      <path d="M120 120 L120 5 A115 115 0 0 1 233 133 Z" fill="url(#radarFade)" />
    </motion.g>
    <circle cx="120" cy="120" r="3" fill="currentColor" />
  </svg>
);

const WaveLine = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 800 120" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <motion.path
      d="M0 60 Q 100 10 200 60 T 400 60 T 600 60 T 800 60"
      stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 0.6 }}
      viewport={{ once: true }}
      transition={{ duration: 2.2, ease: "easeInOut" }}
    />
    <motion.path
      d="M0 70 Q 100 30 200 70 T 400 70 T 600 70 T 800 70"
      stroke="currentColor" strokeWidth="1" fill="none" strokeOpacity="0.35"
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 2.6, delay: 0.2, ease: "easeInOut" }}
    />
  </svg>
);

const ConnectorLine = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 20" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <motion.line
      x1="0" y1="10" x2="200" y2="10"
      stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6"
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    />
  </svg>
);

/* ─── 3D Tilt Card ─────────────────────────────────────────────── */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 10);
    rx.set(-py * 10);
  };
  const reset = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Tile Illustrations ────────────────────────────────────────── */
const PersonaCluster = () => (
  <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
    <svg viewBox="0 0 320 200" className="w-full h-full max-h-[220px]" fill="none" aria-hidden="true">
      {/* connecting arcs */}
      <motion.path d="M60 150 Q 160 40 260 150" stroke="hsl(29 60% 55%)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 5"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6 }} />
      <motion.path d="M110 130 Q 160 90 210 130" stroke="hsl(36 68% 60%)" strokeOpacity="0.5" strokeWidth="1"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, delay: 0.2 }} />
      {/* persona nodes */}
      {[
        { cx: 60, cy: 150, r: 26, label: "A", delay: 0, hue: "29 60% 50%" },
        { cx: 160, cy: 60, r: 30, label: "You", delay: 0.15, hue: "36 68% 55%", primary: true },
        { cx: 260, cy: 150, r: 26, label: "K", delay: 0.3, hue: "12 55% 45%" },
        { cx: 110, cy: 130, r: 18, label: "P", delay: 0.45, hue: "29 60% 55%" },
        { cx: 210, cy: 130, r: 18, label: "R", delay: 0.6, hue: "36 68% 60%" },
      ].map((n, i) => (
        <motion.g key={i}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: n.delay, type: "spring", stiffness: 180, damping: 14 }}
          style={{ originX: `${n.cx}px`, originY: `${n.cy}px` }}
        >
          <circle cx={n.cx} cy={n.cy} r={n.r + 6} fill={`hsl(${n.hue} / 0.08)`} />
          <circle cx={n.cx} cy={n.cy} r={n.r} fill={`hsl(${n.hue} / 0.18)`} stroke={`hsl(${n.hue})`} strokeOpacity="0.6" strokeWidth={n.primary ? 1.5 : 1} />
          {/* mini avatar */}
          <circle cx={n.cx} cy={n.cy - n.r * 0.25} r={n.r * 0.32} fill={`hsl(${n.hue})`} fillOpacity="0.7" />
          <path d={`M${n.cx - n.r * 0.55} ${n.cy + n.r * 0.55} Q ${n.cx} ${n.cy + n.r * 0.15} ${n.cx + n.r * 0.55} ${n.cy + n.r * 0.55}`}
            stroke={`hsl(${n.hue})`} strokeOpacity="0.7" strokeWidth="2" fill="none" strokeLinecap="round" />
          {n.primary && (
            <motion.circle cx={n.cx} cy={n.cy} r={n.r}
              stroke="hsl(36 68% 65%)" strokeWidth="1.5" fill="none"
              animate={{ r: [n.r, n.r + 10], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.g>
      ))}
    </svg>
  </div>
);

const WaveformIllustration = () => (
  <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
    <svg viewBox="0 0 400 100" className="w-full h-full max-h-[120px]" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="wavefade" x1="0" x2="1">
          <stop offset="0%" stopColor="hsl(29 60% 55%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(36 68% 65%)" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(29 60% 55%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 40 }).map((_, i) => {
        const x = 10 + i * 10;
        const baseH = 6 + Math.sin(i * 0.7) * 20 + Math.cos(i * 0.3) * 12;
        const h = Math.abs(baseH) + 4;
        return (
          <motion.rect
            key={i}
            x={x} y={50 - h / 2} width="3" height={h} rx="1.5"
            fill="url(#wavefade)"
            initial={{ scaleY: 0.2 }}
            animate={{ scaleY: [0.3, 1, 0.5, 0.9, 0.3] }}
            transition={{ duration: 2 + (i % 5) * 0.3, repeat: Infinity, delay: i * 0.05, ease: "easeInOut" }}
            style={{ originY: "50px" }}
          />
        );
      })}
    </svg>
  </div>
);

const RadarChartIllustration = () => (
  <div className="relative w-full flex items-center justify-center pointer-events-none">
    <svg viewBox="0 0 160 160" className="w-32 h-32" fill="none" aria-hidden="true">
      {[0.3, 0.55, 0.8].map((f, i) => {
        const pts = Array.from({ length: 5 }).map((_, k) => {
          const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
          return `${80 + Math.cos(a) * 60 * f},${80 + Math.sin(a) * 60 * f}`;
        }).join(" ");
        return <polygon key={i} points={pts} stroke="hsl(29 60% 55%)" strokeOpacity={0.15 + i * 0.05} fill="none" />;
      })}
      {Array.from({ length: 5 }).map((_, k) => {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
        return <line key={k} x1="80" y1="80" x2={80 + Math.cos(a) * 60} y2={80 + Math.sin(a) * 60} stroke="hsl(29 60% 55%)" strokeOpacity="0.15" />;
      })}
      <motion.polygon
        points={[0.72, 0.85, 0.6, 0.78, 0.9].map((f, k) => {
          const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
          return `${80 + Math.cos(a) * 60 * f},${80 + Math.sin(a) * 60 * f}`;
        }).join(" ")}
        fill="hsl(36 68% 55% / 0.25)" stroke="hsl(36 68% 65%)" strokeWidth="1.5"
        initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ originX: "80px", originY: "80px" }}
      />
    </svg>
  </div>
);

const SparkParticles = () => (
  <div className="relative w-full h-full pointer-events-none">
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.span
        key={i}
        className="absolute w-1.5 h-1.5 rounded-full bg-primary-glow"
        style={{ left: `${10 + (i * 11) % 80}%`, top: `${20 + (i * 23) % 60}%` }}
        animate={{ y: [0, -14, 0], opacity: [0.2, 1, 0.2], scale: [0.7, 1.2, 0.7] }}
        transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
      />
    ))}
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100" fill="none" aria-hidden="true">
      <motion.path d="M20 80 Q 60 20 100 60 T 180 40"
        stroke="hsl(36 68% 65%)" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="2 4" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
        transition={{ duration: 1.8, ease: "easeInOut" }} />
    </svg>
  </div>
);

const TrophyLaurel = () => (
  <div className="relative w-full flex items-center justify-center pointer-events-none">
    <svg viewBox="0 0 140 120" className="w-24 h-24" fill="none" aria-hidden="true">
      <motion.path d="M40 100 Q 20 60 30 30" stroke="hsl(36 68% 60%)" strokeOpacity="0.7" strokeWidth="2" fill="none"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
      <motion.path d="M100 100 Q 120 60 110 30" stroke="hsl(36 68% 60%)" strokeOpacity="0.7" strokeWidth="2" fill="none"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
      {[0,1,2,3,4].map(i => (
        <g key={`l${i}`}>
          <ellipse cx={32 + i * 2} cy={80 - i * 14} rx="6" ry="3" fill="hsl(29 60% 50% / 0.5)" transform={`rotate(${-40 + i * 8} ${32 + i * 2} ${80 - i * 14})`} />
          <ellipse cx={108 - i * 2} cy={80 - i * 14} rx="6" ry="3" fill="hsl(29 60% 50% / 0.5)" transform={`rotate(${40 - i * 8} ${108 - i * 2} ${80 - i * 14})`} />
        </g>
      ))}
      <motion.g initial={{ y: 8, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4, type: "spring" }}>
        <path d="M55 40 h30 v18 a15 15 0 0 1 -30 0 z" fill="hsl(36 68% 55%)" />
        <rect x="60" y="60" width="20" height="6" fill="hsl(29 60% 45%)" />
        <rect x="52" y="66" width="36" height="5" rx="1" fill="hsl(36 68% 60%)" />
      </motion.g>
    </svg>
  </div>
);

const TileIllustration = ({ kind }: { kind: string }) => {
  switch (kind) {
    case "persona": return <PersonaCluster />;
    case "waveform": return <WaveformIllustration />;
    case "radar": return <RadarChartIllustration />;
    case "sparks": return <SparkParticles />;
    case "trophy": return <TrophyLaurel />;
    default: return null;
  }
};

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
  { icon: Users, kind: "persona", title: "Multi-persona AI", body: "Debate with 2–6 AI participants — each with a distinct temperament, tempo, and viewpoint.", span: "md:col-span-2 md:row-span-2", accent: true },
  { icon: Radar, kind: "radar", title: "Radar analytics", body: "Post-session scores on content, fluency, structure, empathy and leadership.", span: "" },
  { icon: Sparkles, kind: "sparks", title: "Live coaching", body: "Real-time nudges on pace, fillers, and clarity while you speak.", span: "" },
  { icon: Waves, kind: "waveform", title: "Voice fidelity", body: "Natural microphone flow with turn-taking that never feels robotic.", span: "md:col-span-2" },
  { icon: Trophy, kind: "trophy", title: "Achievements", body: "XP, streaks, and badges that reward the craft, not just the effort.", span: "" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const orbY1 = useTransform(scrollY, [0, 800], [0, 120]);
  const orbY2 = useTransform(scrollY, [0, 800], [0, -80]);
  const orbY3 = useTransform(scrollY, [0, 800], [0, 60]);

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden relative">
      <SEOHead
        description="GD Buddy (Group Discussion Buddy) — practice group discussions with AI participants. Free AI GD simulator for placement preparation."
        keywords="group discussion buddy, GD Buddy, group discussion practice, AI group discussion practice, GD practice online, group discussion simulator"
        path="/"
        jsonLd={[webAppJsonLd, orgJsonLd, faqJsonLd]}
      />

      {/* Ambient orbs with parallax */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <motion.div style={{ y: orbY1, background: "hsl(29 60% 45% / 0.55)" }} className="ambient-orb w-[52vw] h-[52vw] -top-[15%] -left-[10%]" />
        <motion.div style={{ y: orbY2, background: "hsl(12 55% 40% / 0.45)", animationDelay: "3s" }} className="ambient-orb w-[46vw] h-[46vw] top-[10%] -right-[10%]" />
        <motion.div style={{ y: orbY3, background: "hsl(36 68% 40% / 0.35)", animationDelay: "6s" }} className="ambient-orb w-[38vw] h-[38vw] bottom-[-15%] left-[20%]" />
        {/* Decorative dot grids */}
        <DotGrid className="absolute top-24 right-4 text-primary/20 w-40 h-40 hidden md:block" />
        <DotGrid className="absolute bottom-24 left-4 text-primary/15 w-32 h-32 hidden md:block" />
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

                {/* Floating radar SVG badge */}
                <motion.div
                  className="absolute -top-8 -right-6 w-28 h-28 text-primary-glow hidden md:block pointer-events-none"
                  animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <RadarRings className="w-full h-full drop-shadow-[0_0_20px_hsl(29_60%_50%/0.4)]" />
                </motion.div>

                {/* Floating chip — sparkle */}
                <motion.div
                  className="absolute -bottom-4 -left-4 glass rounded-2xl px-3 py-2 flex items-center gap-2 shadow-copper hidden md:flex"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }}
                  transition={{ delay: 0.8, duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-4 h-4 text-primary-glow" />
                  <span className="text-micro">+12 XP earned</span>
                </motion.div>

                <TiltCard className="glass-strong rounded-3xl p-6 md:p-7 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-micro text-muted-foreground flex items-center gap-2">
                      <Mic className="w-3 h-3" /> Session · GD-992
                    </span>
                    <motion.span
                      className="text-micro px-2 py-1 rounded-full bg-primary/15 text-primary-glow flex items-center gap-1.5"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-glow" />
                      Recording
                    </motion.span>
                  </div>

                  {/* Participant grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { name: "You", speaking: true },
                      { name: "Aisha AI", speaking: false },
                      { name: "Kenji AI", speaking: false },
                      { name: "Priya AI", speaking: false },
                    ].map((p, idx) => (
                      <motion.div
                        key={p.name}
                        whileHover={{ scale: 1.03, y: -2 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`aspect-video relative rounded-2xl glass-subtle overflow-hidden ${p.speaking ? "ring-2 ring-primary/60 copper-glow" : ""}`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/5" />
                        {/* Persona avatar mark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                          <svg viewBox="0 0 40 40" className="w-10 h-10 text-primary-glow" fill="none">
                            <circle cx="20" cy="14" r="6" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M6 34 Q 20 22 34 34" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </div>
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
                        {!p.speaking && idx === 1 && (
                          <motion.div
                            className="absolute top-2 right-2 w-5 h-5 rounded-full glass flex items-center justify-center"
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Feather className="w-3 h-3 text-primary-glow" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Analytics bar */}
                  <div className="glass-subtle rounded-2xl p-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-micro mb-2">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Gauge className="w-3 h-3" /> Speech quality</span>
                        <span className="text-primary-glow">84% · clear</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: "84%" }}
                          transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
                          style={{
                            backgroundImage: "linear-gradient(90deg, hsl(29 60% 50%), hsl(36 68% 70%), hsl(29 60% 50%))",
                            backgroundSize: "200% 100%",
                            animation: "copper-shimmer 3s linear infinite",
                          }}
                        />
                      </div>
                    </div>
                    {/* Mini stat chips */}
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { i: Waves, l: "142 wpm" },
                        { i: Target, l: "3 fillers" },
                        { i: Star, l: "Lead 92" },
                      ].map(({ i: I, l }) => (
                        <span key={l} className="text-micro glass rounded-full px-2 py-1 flex items-center gap-1 text-foreground/80">
                          <I className="w-3 h-3 text-primary-glow" />{l}
                        </span>
                      ))}
                    </div>
                  </div>
                </TiltCard>
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
              <motion.div key={tile.title} variants={fadeRise} className={`${tile.span}`}>
                <TiltCard className="glass rounded-3xl p-6 md:p-7 relative overflow-hidden group h-full">
                  {tile.accent && (
                    <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-copper opacity-20 blur-3xl group-hover:opacity-50 transition-opacity duration-slow" />
                  )}
                  <svg className="absolute bottom-2 right-2 w-16 h-16 text-primary/10 group-hover:text-primary/25 transition-colors duration-slow" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" />
                    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" />
                    <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <div className="relative flex flex-col h-full gap-4" style={{ transform: "translateZ(30px)" }}>
                    <div className="relative w-12 h-12">
                      <motion.div
                        className="absolute inset-0 rounded-2xl border border-primary/30"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute inset-0.5 rounded-2xl glass-subtle flex items-center justify-center group-hover:shadow-copper transition-shadow">
                        <tile.icon className="w-5 h-5 text-primary-glow group-hover:scale-110 transition-transform" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-h3 mb-2">{tile.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tile.body}</p>
                    </div>
                    <div className="flex items-center gap-1 text-micro text-primary-glow opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Editorial process strip */}
        <section className="container mx-auto px-4 md:px-6 py-16" aria-label="How it works">
          <div className="glass-strong rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
            <WaveLine className="absolute inset-x-0 top-1/2 w-full h-24 text-primary/20 -translate-y-1/2 pointer-events-none" />
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8 relative">
              <h2 className="text-h1 font-display">
                Four moves. <span className="italic-accent copper-text">One rehearsal.</span>
              </h2>
              <span className="text-micro text-muted-foreground">The GD Buddy method</span>
            </div>
            <ol className="grid md:grid-cols-4 gap-6 relative">
              {[
                { n: "01", t: "Choose a topic", d: "Pick from 150+ curated placement prompts or ask AI for one.", Icon: Compass },
                { n: "02", t: "Assemble the room", d: "Balance personas — the skeptic, the empath, the analyst.", Icon: Users },
                { n: "03", t: "Speak the case", d: "Turn-taking, coaching, and pacing feedback in real time.", Icon: Mic },
                { n: "04", t: "Read the radar", d: "Score cards on clarity, empathy, structure, leadership.", Icon: Radar },
              ].map((s, idx, arr) => (
                <motion.li
                  key={s.n}
                  className="space-y-3 relative group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.12, duration: 0.6, ease: "easeOut" }}
                >
                  <div className="relative flex items-center gap-3">
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-gradient-copper flex items-center justify-center shadow-copper relative"
                      whileHover={{ rotate: [0, -8, 8, 0], scale: 1.06 }}
                      transition={{ duration: 0.6 }}
                    >
                      <s.Icon className="w-5 h-5 text-primary-foreground" />
                      <span className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full glass text-primary-glow font-mono">{s.n}</span>
                    </motion.div>
                    {idx < arr.length - 1 && (
                      <ConnectorLine className="hidden md:block absolute left-14 right-[-1.5rem] top-6 text-primary/40 h-3" />
                    )}
                  </div>
                  <h3 className="font-display text-h3 group-hover:copper-text transition-colors">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </motion.li>
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
