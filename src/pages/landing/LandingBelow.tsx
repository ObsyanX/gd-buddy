import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Compass, Users, Mic, Radar, Newspaper } from "lucide-react";
import { stagger } from "@/lib/motion";
import SEOFooter from "@/components/SEOFooter";
import { LandingAdSection } from "@/components/ads/LandingAdSection";
import { SupportSection } from "@/components/support/SupportSection";
import {
  BENTO, BentoTile, WaveLine, ConnectorLine, LANDING_FAQS,
} from "./parts";


/**
 * Below-the-fold sections of the landing page.
 *
 * Previously lazy-loaded, but now rendered eagerly so AdSense and search
 * crawlers can index the full page content without executing a dynamic import.
 */
const LandingBelow = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* BENTO features */}
      <section
        id="features"
        className="container mx-auto px-4 md:px-6 py-16"
        aria-label="Features"
      >
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
            <BentoTile key={tile.title} tile={tile} />
          ))}
        </motion.div>
      </section>

      {/* Editorial process strip */}
      <section
        className="container mx-auto px-4 md:px-6 py-16"
        aria-label="How it works"
      >
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
                transition={{ delay: idx * 0.08, duration: 0.5, ease: "easeOut" }}
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

      {/* Editorial about section */}
      <section
        className="container mx-auto px-4 md:px-6 py-16"
        aria-label="About GD Buddy"
      >
        <div className="max-w-3xl">
          <p className="text-micro text-primary-glow mb-4">The platform</p>
          <h2 className="text-h1 font-display leading-tight mb-6">
            Practice group discussions the way <span className="italic-accent copper-text">top campuses</span> expect them.
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              GD Buddy is a free AI-powered practice platform for students preparing for campus placement rounds.
              We combine realistic AI participants, real-time coaching, and structured analytics so you can
              rehearse the exact skills recruiters evaluate: clarity, structure, leadership, empathy, and presence.
            </p>
            <p>
              Unlike generic speaking apps, GD Buddy simulates a real group discussion room. AI personas interrupt,
              disagree, ask follow-ups, and summarize — just like a live panel. After every session you receive a
              detailed report with scores, filler-word counts, pace analysis, and actionable next steps.
            </p>
            <p>
              The platform also includes a curated library of 150+ placement topics, strategy guides, and a blog
              with fresh GD and interview advice every week. Everything is designed to help you walk into your next
              GD round with confidence.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/about">Read more about us <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/blog">Visit the blog <Newspaper className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section
        className="container mx-auto px-4 md:px-6 py-16"
        aria-label="GD preparation resources"
      >
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

      <LandingAdSection />

      <SupportSection />

      {/* FAQ */}


      <section
        className="container mx-auto px-4 md:px-6 py-16"
        aria-label="Frequently asked questions"
      >
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
      <section
        className="container mx-auto px-4 md:px-6 py-16"
        aria-label="Call to action"
      >
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

      <SEOFooter />
    </>
  );
};

export default LandingBelow;
