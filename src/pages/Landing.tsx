import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { lazy, Suspense, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Mic, Target, ArrowRight, Play, Sparkles, Feather, Gauge, Star, Waves,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";
import { fadeRise, stagger, wordRise } from "@/lib/motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { DotGrid, RadarRings, TiltCard, LANDING_FAQS } from "./landing/parts";

/* Lazy-load everything below the hero — big win for LCP + TBT. */
const LandingBelow = lazy(() => import("./landing/LandingBelow"));

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

const Landing = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const isMobile = useIsMobile();
  const heavyMotionOff = prefersReduced || isMobile;

  // Parallax only on desktop non-reduced. useScroll installs a scroll listener,
  // so we still create it but zero out the transforms on mobile.
  const { scrollY } = useScroll();
  const rawY1 = useTransform(scrollY, [0, 800], [0, 120]);
  const rawY2 = useTransform(scrollY, [0, 800], [0, -80]);
  const rawY3 = useTransform(scrollY, [0, 800], [0, 60]);
  const orbY1 = heavyMotionOff ? 0 : rawY1;
  const orbY2 = heavyMotionOff ? 0 : rawY2;
  const orbY3 = heavyMotionOff ? 0 : rawY3;

  // Prime the /auth route + LandingBelow chunk on first CTA hover/focus.
  const prefetchAuth = useCallback(() => {
    import("./Auth").catch(() => {});
    import("./landing/LandingBelow").catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden relative">
      <SEOHead
        description="GD Buddy (Group Discussion Buddy) — practice group discussions with AI participants. Free AI GD simulator for placement preparation."
        keywords="group discussion buddy, GD Buddy, group discussion practice, AI group discussion practice, GD practice online, group discussion simulator"
        path="/"
        jsonLd={[webAppJsonLd, orgJsonLd, faqJsonLd]}
      />

      {/* Ambient orbs — 2 on mobile, 3 + dot grids on desktop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <motion.div style={{ y: orbY1, background: "hsl(29 60% 45% / 0.55)" }} className="ambient-orb w-[52vw] h-[52vw] -top-[15%] -left-[10%]" />
        <motion.div style={{ y: orbY2, background: "hsl(12 55% 40% / 0.45)", animationDelay: "3s" }} className="ambient-orb w-[46vw] h-[46vw] top-[10%] -right-[10%]" />
        {!isMobile && (
          <>
            <motion.div style={{ y: orbY3, background: "hsl(36 68% 40% / 0.35)", animationDelay: "6s" }} className="ambient-orb w-[38vw] h-[38vw] bottom-[-15%] left-[20%]" />
            <DotGrid className="absolute top-24 right-4 text-primary/20 w-40 h-40 hidden md:block" />
            <DotGrid className="absolute bottom-24 left-4 text-primary/15 w-32 h-32 hidden md:block" />
          </>
        )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/auth")}
                onMouseEnter={prefetchAuth}
                onFocus={prefetchAuth}
                onTouchStart={prefetchAuth}
                className="hidden sm:inline-flex"
              >
                Sign in
              </Button>
              <Button
                variant="premium"
                size="sm"
                onClick={() => navigate("/auth")}
                onMouseEnter={prefetchAuth}
                onFocus={prefetchAuth}
                onTouchStart={prefetchAuth}
              >
                Start free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10" role="main">
        {/* HERO */}
        <section className="container mx-auto px-4 md:px-6 pt-8 md:pt-16 pb-16" aria-label="Hero">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger(0.1, 0.12)}
            className="glass-strong rounded-[2.5rem] overflow-hidden shadow-premium"
          >
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 p-6 sm:p-8 md:p-12 lg:p-16 items-center">
              {/* Left content */}
              <div className="space-y-6 md:space-y-8">
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

                <motion.p variants={fadeRise} className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
                  Master group discussions with multi-persona AI, real-time coaching, and radar-grade analytics —
                  crafted for placement rounds that reward the poised.
                </motion.p>

                <motion.div variants={fadeRise} className="flex flex-wrap gap-3">
                  <Button
                    variant="premium"
                    size="lg"
                    onClick={() => navigate("/auth")}
                    onMouseEnter={prefetchAuth}
                    onFocus={prefetchAuth}
                    onTouchStart={prefetchAuth}
                    aria-label="Start practicing GD"
                  >
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

                {/* Desktop-only floating flourishes */}
                {!isMobile && (
                  <>
                    <motion.div
                      className="absolute -top-8 -right-6 w-28 h-28 text-primary-glow hidden md:block pointer-events-none"
                      animate={heavyMotionOff ? undefined : { y: [0, -10, 0], rotate: [0, 3, 0] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <RadarRings className="w-full h-full drop-shadow-[0_0_20px_hsl(29_60%_50%/0.4)]" />
                    </motion.div>

                    <motion.div
                      className="absolute -bottom-4 -left-4 glass rounded-2xl px-3 py-2 flex items-center gap-2 shadow-copper hidden md:flex"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={heavyMotionOff ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, 6, 0] }}
                      transition={{ delay: 0.8, duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-4 h-4 text-primary-glow" />
                      <span className="text-micro">+12 XP earned</span>
                    </motion.div>
                  </>
                )}

                <TiltCard className="glass-strong rounded-3xl p-5 sm:p-6 md:p-7 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-micro text-muted-foreground flex items-center gap-2">
                      <Mic className="w-3 h-3" /> Session · GD-992
                    </span>
                    <motion.span
                      className="text-micro px-2 py-1 rounded-full bg-primary/15 text-primary-glow flex items-center gap-1.5"
                      animate={heavyMotionOff ? undefined : { opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-glow" />
                      Recording
                    </motion.span>
                  </div>

                  {/* Participant grid */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-6">
                    {[
                      { name: "You", speaking: true },
                      { name: "Aisha AI", speaking: false },
                      { name: "Kenji AI", speaking: false },
                      { name: "Priya AI", speaking: false },
                    ].map((p, idx) => (
                      <motion.div
                        key={p.name}
                        whileHover={heavyMotionOff ? undefined : { scale: 1.03, y: -2 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`aspect-video relative rounded-2xl glass-subtle overflow-hidden ${p.speaking ? "ring-2 ring-primary/60 copper-glow" : ""}`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/5" />
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
                        {!p.speaking && idx === 1 && !heavyMotionOff && (
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
                            animation: heavyMotionOff ? undefined : "copper-shimmer 3s linear infinite",
                          }}
                        />
                      </div>
                    </div>
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
                <div key={s.v} className="p-4 sm:p-6 text-center border-r last:border-r-0 border-border/60">
                  <div className="font-display text-2xl md:text-3xl copper-text">{s.k}</div>
                  <div className="text-micro text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Everything below the hero is lazy — big TBT/LCP win on mobile. */}
        <Suspense
          fallback={
            <div className="container mx-auto px-4 md:px-6 py-16 space-y-6" aria-busy="true">
              <div className="rounded-[2.5rem] h-40 skeleton-shimmer" />
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-3xl h-48 skeleton-shimmer" />
                <div className="rounded-3xl h-48 skeleton-shimmer" />
                <div className="rounded-3xl h-48 skeleton-shimmer" />
              </div>
            </div>
          }
        >
          <LandingBelow />
        </Suspense>
      </main>

      <SEOFooter />
    </div>
  );
};

export default Landing;
