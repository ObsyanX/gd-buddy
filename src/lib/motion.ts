/**
 * Shared framer-motion variants for the premium sienna glass design system.
 * All motion respects prefers-reduced-motion via CSS overrides in index.css.
 */
import type { Variants } from "framer-motion";

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0)", transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export const stagger = (delayChildren = 0, staggerChildren = 0.08): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

export const wordRise: Variants = {
  hidden: { y: "60%", opacity: 0, filter: "blur(6px)" },
  show: { y: 0, opacity: 1, filter: "blur(0)", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

export const tiltHover = {
  whileHover: { y: -6, rotate: -0.4, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  whileTap: { scale: 0.985 },
};

export const orbBreathe: Variants = {
  animate: {
    scale: [1, 1.08, 1],
    opacity: [0.55, 0.85, 0.55],
    transition: { duration: 12, repeat: Infinity, ease: "easeInOut" },
  },
};

export const underlineDraw: Variants = {
  hidden: { scaleX: 0, originX: 1 },
  show: { scaleX: 1, originX: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
