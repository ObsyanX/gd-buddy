/**
 * Motion System — GD Buddy premium sienna glass design.
 *
 * Principles:
 *  1. Communicative motion: entrances rise, exits fall, dialogs zoom.
 *  2. Spring physics for anything the user directly manipulates.
 *  3. Editorial easing for choreographed reveals (long, decelerating).
 *  4. Respect prefers-reduced-motion via CSS overrides in index.css.
 *
 * Import variants + tokens from here; do not inline magic numbers.
 */
import type { Transition, Variants } from "framer-motion";

/* -------------------------------------------------- *
 * TOKENS — durations & easings                       *
 * -------------------------------------------------- */

export const duration = {
  instant: 0.1,
  fast: 0.15,
  base: 0.2,
  normal: 0.3,
  slow: 0.45,
  slower: 0.7,
  scene: 1.1,
} as const;

// Cubic-bezier curves — match --ease-* CSS tokens
export const ease = {
  standard: [0.4, 0, 0.2, 1] as const,
  emphasized: [0.22, 1, 0.36, 1] as const,
  entrance: [0, 0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  editorial: [0.22, 1, 0.36, 1] as const,
  softSpring: [0.34, 1.4, 0.5, 1] as const,
  snapSpring: [0.5, 1.6, 0.4, 1] as const,
} as const;

/* -------------------------------------------------- *
 * SPRINGS — physics presets                          *
 * -------------------------------------------------- */

export const spring = {
  gentle: { type: "spring", stiffness: 180, damping: 22, mass: 0.9 } satisfies Transition,
  responsive: { type: "spring", stiffness: 320, damping: 26, mass: 0.8 } satisfies Transition,
  snappy: { type: "spring", stiffness: 480, damping: 30, mass: 0.7 } satisfies Transition,
  bouncy: { type: "spring", stiffness: 300, damping: 14, mass: 0.9 } satisfies Transition,
  drawer: { type: "spring", stiffness: 260, damping: 32, mass: 1 } satisfies Transition,
} as const;

/* -------------------------------------------------- *
 * ENTRANCE / EXIT VARIANTS                           *
 * -------------------------------------------------- */

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slower, ease: ease.editorial },
  },
  exit: {
    opacity: 0,
    y: 12,
    filter: "blur(4px)",
    transition: { duration: duration.normal, ease: ease.exit },
  },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -18 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.editorial } },
  exit: { opacity: 0, y: -10, transition: { duration: duration.base, ease: ease.exit } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.normal, ease: ease.standard } },
  exit: { opacity: 0, transition: { duration: duration.base, ease: ease.exit } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: spring.responsive },
  exit: { opacity: 0, scale: 0.96, transition: { duration: duration.base, ease: ease.exit } },
};

export const zoomDialog: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 8, filter: "blur(8px)" },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease: ease.emphasized },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 4,
    filter: "blur(6px)",
    transition: { duration: duration.base, ease: ease.exit },
  },
};

export const slideInRight: Variants = {
  hidden: { x: "100%", opacity: 0 },
  show: { x: 0, opacity: 1, transition: spring.drawer },
  exit: { x: "100%", opacity: 0, transition: { duration: duration.normal, ease: ease.exit } },
};

export const slideInLeft: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  show: { x: 0, opacity: 1, transition: spring.drawer },
  exit: { x: "-100%", opacity: 0, transition: { duration: duration.normal, ease: ease.exit } },
};

export const slideUp: Variants = {
  hidden: { y: "100%", opacity: 0 },
  show: { y: 0, opacity: 1, transition: spring.drawer },
  exit: { y: "100%", opacity: 0, transition: { duration: duration.normal, ease: ease.exit } },
};

/* -------------------------------------------------- *
 * CHOREOGRAPHY — staggered containers                *
 * -------------------------------------------------- */

export const stagger = (delayChildren = 0, staggerChildren = 0.08): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
});

export const staggerFast = stagger(0, 0.04);
export const staggerBase = stagger(0.05, 0.08);
export const staggerSlow = stagger(0.1, 0.14);

/* -------------------------------------------------- *
 * TEXT — word/character rise                          *
 * -------------------------------------------------- */

export const wordRise: Variants = {
  hidden: { y: "60%", opacity: 0, filter: "blur(6px)" },
  show: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: duration.scene, ease: ease.editorial },
  },
};

export const charRise: Variants = {
  hidden: { y: "90%", opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: duration.slower, ease: ease.editorial },
  },
};

export const underlineDraw: Variants = {
  hidden: { scaleX: 0, originX: 1 },
  show: { scaleX: 1, originX: 0, transition: { duration: 0.55, ease: ease.editorial } },
};

/* -------------------------------------------------- *
 * INTERACTIVE — hover / tap primitives                *
 * -------------------------------------------------- */

export const tiltHover = {
  whileHover: { y: -6, rotate: -0.4, transition: { duration: 0.35, ease: ease.editorial } },
  whileTap: { scale: 0.985 },
} as const;

export const liftHover = {
  whileHover: { y: -3, transition: spring.responsive },
  whileTap: { y: 0, scale: 0.98, transition: spring.snappy },
} as const;

export const pressTap = {
  whileTap: { scale: 0.96, transition: spring.snappy },
} as const;

/* -------------------------------------------------- *
 * AMBIENT — looping motion                           *
 * -------------------------------------------------- */

export const orbBreathe: Variants = {
  animate: {
    scale: [1, 1.08, 1],
    opacity: [0.55, 0.85, 0.55],
    transition: { duration: 12, repeat: Infinity, ease: "easeInOut" },
  },
};

export const shimmer: Variants = {
  animate: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: { duration: 6, repeat: Infinity, ease: "linear" },
  },
};

/* -------------------------------------------------- *
 * VIEWPORT — reveal-on-scroll helper props           *
 * -------------------------------------------------- */

export const viewportOnce = { once: true, margin: "0px 0px -10% 0px" } as const;
export const viewportRepeat = { once: false, margin: "0px 0px -10% 0px" } as const;
