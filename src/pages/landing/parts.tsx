import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowRight, Users, Radar, Sparkles, Waves, Trophy } from "lucide-react";
import { fadeRise } from "@/lib/motion";

/* ─── Decorative SVGs ───────────────────────────────────────────── */
export const DotGrid = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="200" height="200" viewBox="0 0 200 200" fill="none" aria-hidden="true">
    <defs>
      <pattern id="dotgrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.2" fill="currentColor" />
      </pattern>
    </defs>
    <rect width="200" height="200" fill="url(#dotgrid)" />
  </svg>
);

export const RadarRings = ({ className = "" }: { className?: string }) => (
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

export const WaveLine = ({ className = "" }: { className?: string }) => (
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

export const ConnectorLine = ({ className = "" }: { className?: string }) => (
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

/* ─── 3D Tilt Card (mobile-safe: tilt off on touch/reduced motion) ─ */
export function TiltCard({
  children,
  className = "",
  onActivate,
}: {
  children: React.ReactNode;
  className?: string;
  onActivate?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const isMobile = useIsMobile();
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });

  const tiltEnabled = !prefersReduced && !isMobile;

  const handleMove = (e: React.PointerEvent) => {
    if (!tiltEnabled) return;
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 10);
    rx.set(-py * 10);
  };
  const reset = () => { rx.set(0); ry.set(0); };

  if (!tiltEnabled) {
    // Cheap wrapper: no motion, no perspective — big perf win on mobile.
    return (
      <div ref={ref} className={className} onPointerDown={onActivate}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerDown={onActivate}
      onHoverStart={onActivate}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 1000 }}
      whileTap={{ scale: 0.985 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Particle burst overlay (desktop only) ──────────────────────── */
export function ParticleBurst({ active }: { active: number }) {
  const prefersReduced = useReducedMotion();
  const isMobile = useIsMobile();
  if (prefersReduced || isMobile) return null;
  return (
    <AnimatePresence>
      {active > 0 && (
        <motion.div
          key={active}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Array.from({ length: 10 }).map((_, i) => {
            const angle = (i / 10) * Math.PI * 2;
            const dx = Math.cos(angle) * 60;
            const dy = Math.sin(angle) * 60;
            return (
              <motion.span
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary-glow shadow-[0_0_8px_hsl(36_68%_65%)]"
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                animate={{ x: dx, y: dy, opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Lazy illustration mount ────────────────────────────────────── */
export function LazyIllustration({ kind }: { kind: string }) {
  const { ref, isVisible } = useScrollReveal(0.2);
  return (
    <div
      ref={ref}
      className="w-full h-full"
      style={{ contentVisibility: "auto" as never, containIntrinsicSize: "180px" }}
    >
      {isVisible ? <TileIllustration kind={kind} /> : null}
    </div>
  );
}

/* ─── Tile Illustrations ────────────────────────────────────────── */
const PersonaCluster = () => (
  <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
    <svg viewBox="0 0 320 200" className="w-full h-full max-h-[220px]" fill="none" aria-hidden="true">
      <motion.path d="M60 150 Q 160 40 260 150" stroke="hsl(29 60% 55%)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 5"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6 }} />
      <motion.path d="M110 130 Q 160 90 210 130" stroke="hsl(36 68% 60%)" strokeOpacity="0.5" strokeWidth="1"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, delay: 0.2 }} />
      {[
        { cx: 60, cy: 150, r: 26, delay: 0, hue: "29 60% 50%" },
        { cx: 160, cy: 60, r: 30, delay: 0.15, hue: "36 68% 55%", primary: true },
        { cx: 260, cy: 150, r: 26, delay: 0.3, hue: "12 55% 45%" },
        { cx: 110, cy: 130, r: 18, delay: 0.45, hue: "29 60% 55%" },
        { cx: 210, cy: 130, r: 18, delay: 0.6, hue: "36 68% 60%" },
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

const WaveformIllustration = () => {
  // Reduced bar count for mobile perf.
  const isMobile = useIsMobile();
  const count = isMobile ? 20 : 40;
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <svg viewBox="0 0 400 100" className="w-full h-full max-h-[120px]" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="wavefade" x1="0" x2="1">
            <stop offset="0%" stopColor="hsl(29 60% 55%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(36 68% 65%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(29 60% 55%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: count }).map((_, i) => {
          const x = 10 + i * (380 / count);
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
};

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

const SparkParticles = () => {
  const isMobile = useIsMobile();
  const count = isMobile ? 4 : 8;
  return (
    <div className="relative w-full h-full pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
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
};

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

export const TileIllustration = ({ kind }: { kind: string }) => {
  switch (kind) {
    case "persona": return <PersonaCluster />;
    case "waveform": return <WaveformIllustration />;
    case "radar": return <RadarChartIllustration />;
    case "sparks": return <SparkParticles />;
    case "trophy": return <TrophyLaurel />;
    default: return null;
  }
};

export const LANDING_FAQS = [
  { q: "What is GD Buddy?", a: "GD Buddy is a free AI-powered platform that lets students practice group discussions with realistic AI participants, get real-time feedback on communication skills, and prepare for placement GD rounds." },
  { q: "Is GD Buddy free to use?", a: "Yes. GD Buddy is completely free. You can start practicing group discussions instantly after signing up." },
  { q: "How does the AI simulate a real group discussion?", a: "GD Buddy uses multiple AI personas with distinct debate styles, tones, and viewpoints. They respond to your arguments in real-time with realistic turn-taking, just like a real placement GD." },
  { q: "What kind of feedback does GD Buddy provide?", a: "You receive detailed post-session reports covering content quality, fluency, filler word count, speaking pace, argument structure, eye contact, posture, and actionable improvement suggestions." },
  { q: "Can I practice with friends?", a: "Yes! GD Buddy has a multiplayer mode where you can create a room, share a code with friends, and practice together alongside AI participants." },
  { q: "Who is GD Buddy for?", a: "GD Buddy is designed for engineering and MBA students preparing for campus placements, job seekers, public speaking enthusiasts, and study groups who want structured GD practice." },
];

export type BentoTileData = {
  icon: React.ComponentType<any>;
  kind: string;
  title: string;
  body: string;
  span: string;
  accent?: boolean;
};

export const BENTO: BentoTileData[] = [
  { icon: Users, kind: "persona", title: "Multi-persona AI", body: "Debate with 2–6 AI participants — each with a distinct temperament, tempo, and viewpoint.", span: "md:col-span-2 md:row-span-2", accent: true },
  { icon: Radar, kind: "radar", title: "Radar analytics", body: "Post-session scores on content, fluency, structure, empathy and leadership.", span: "" },
  { icon: Sparkles, kind: "sparks", title: "Live coaching", body: "Real-time nudges on pace, fillers, and clarity while you speak.", span: "" },
  { icon: Waves, kind: "waveform", title: "Voice fidelity", body: "Natural microphone flow with turn-taking that never feels robotic.", span: "md:col-span-2" },
  { icon: Trophy, kind: "trophy", title: "Achievements", body: "XP, streaks, and badges that reward the craft, not just the effort.", span: "" },
];

/* ─── Bento tile with scroll-triggered animation + burst ─────────── */
export function BentoTile({ tile }: { tile: BentoTileData }) {
  const [burst, setBurst] = useState(0);
  const prefersReduced = useReducedMotion();
  const isMobile = useIsMobile();
  const lastBurstRef = useRef(0);

  const fire = () => {
    if (prefersReduced || isMobile) return;
    const now = Date.now();
    if (now - lastBurstRef.current < 600) return;
    lastBurstRef.current = now;
    setBurst((n) => n + 1);
  };

  return (
    <motion.div
      variants={fadeRise}
      className={tile.span}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
    >
      <TiltCard
        onActivate={fire}
        className="glass rounded-3xl p-6 md:p-7 relative overflow-hidden group h-full"
      >
        {tile.accent && (
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-copper opacity-20 blur-3xl group-hover:opacity-50 transition-opacity duration-slow" />
        )}
        <svg
          className="absolute bottom-2 right-2 w-16 h-16 text-primary/10 group-hover:text-primary/25 transition-colors duration-slow"
          viewBox="0 0 64 64" fill="none" aria-hidden="true"
        >
          <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" />
          <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="1" />
        </svg>

        {!isMobile && !prefersReduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: burst > 0 ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            style={{
              boxShadow:
                "inset 0 0 60px hsl(36 68% 55% / 0.28), 0 0 40px hsl(29 60% 45% / 0.35)",
            }}
          />
        )}

        <div
          className="relative flex flex-col h-full gap-4"
          style={prefersReduced || isMobile ? undefined : { transform: "translateZ(30px)" }}
        >
          <div className="relative w-12 h-12">
            {!prefersReduced && !isMobile && (
              <motion.div
                className="absolute inset-0 rounded-2xl border border-primary/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              />
            )}
            <div className="absolute inset-0.5 rounded-2xl glass-subtle flex items-center justify-center group-hover:shadow-copper transition-shadow">
              <tile.icon className="w-5 h-5 text-primary-glow group-hover:scale-110 transition-transform" aria-hidden={true} />
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <h3 className="font-display text-h3 mb-2">{tile.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{tile.body}</p>
            <div className="flex-1 min-h-[80px] mt-4 relative">
              <LazyIllustration kind={tile.kind} />
              <ParticleBurst active={burst} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-micro text-primary-glow opacity-0 group-hover:opacity-100 transition-opacity">
            Tap to spark <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}
