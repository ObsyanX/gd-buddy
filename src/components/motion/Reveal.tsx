/**
 * Reveal — declarative viewport-triggered entrance choreography.
 *
 * Usage:
 *   <Reveal>content fades and rises when scrolled into view</Reveal>
 *   <Reveal as="section" variant="scale" delay={0.1}>...</Reveal>
 *   <Stagger><Reveal>a</Reveal><Reveal>b</Reveal></Stagger>
 */
import { motion, type MotionProps, type Variants } from "framer-motion";
import { forwardRef, type ElementType, type ReactNode } from "react";
import {
  fadeRise,
  fadeIn,
  fadeDown,
  scaleIn,
  staggerBase,
  viewportOnce,
  viewportRepeat,
} from "@/lib/motion";

type RevealVariant = "rise" | "fade" | "down" | "scale";

const variantMap: Record<RevealVariant, Variants> = {
  rise: fadeRise,
  fade: fadeIn,
  down: fadeDown,
  scale: scaleIn,
};

interface RevealProps extends Omit<MotionProps, "variants" | "initial" | "animate" | "exit"> {
  children: ReactNode;
  as?: ElementType;
  variant?: RevealVariant;
  delay?: number;
  once?: boolean;
  className?: string;
}

export const Reveal = forwardRef<HTMLElement, RevealProps>(
  ({ children, as = "div", variant = "rise", delay = 0, once = true, className, ...rest }, ref) => {
    const Comp = motion(as as ElementType) as unknown as typeof motion.div;
    const base = variantMap[variant];
    const withDelay: Variants = delay
      ? {
          ...base,
          show: {
            ...(base.show as object),
            transition: {
              ...((base.show as { transition?: object }).transition ?? {}),
              delay,
            },
          },
        }
      : base;

    return (
      <Comp
        ref={ref as never}
        className={className}
        variants={withDelay}
        initial="hidden"
        whileInView="show"
        viewport={once ? viewportOnce : viewportRepeat}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Reveal.displayName = "Reveal";

interface StaggerProps extends Omit<MotionProps, "variants" | "initial" | "animate"> {
  children: ReactNode;
  as?: ElementType;
  delayChildren?: number;
  staggerChildren?: number;
  once?: boolean;
  className?: string;
}

export const Stagger = forwardRef<HTMLElement, StaggerProps>(
  (
    {
      children,
      as = "div",
      delayChildren = 0.05,
      staggerChildren = 0.08,
      once = true,
      className,
      ...rest
    },
    ref,
  ) => {
    const Comp = motion(as as ElementType) as unknown as typeof motion.div;
    const container: Variants = {
      hidden: {},
      show: { transition: { delayChildren, staggerChildren } },
    };

    return (
      <Comp
        ref={ref as never}
        className={className}
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={once ? viewportOnce : viewportRepeat}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Stagger.displayName = "Stagger";

/** Item to place inside <Stagger/>. Uses parent variants — no props needed. */
export const StaggerItem = forwardRef<HTMLElement, {
  children: ReactNode;
  as?: ElementType;
  variant?: RevealVariant;
  className?: string;
} & Omit<MotionProps, "variants">>(
  ({ children, as = "div", variant = "rise", className, ...rest }, ref) => {
    const Comp = motion(as as ElementType) as unknown as typeof motion.div;
    return (
      <Comp ref={ref as never} className={className} variants={variantMap[variant]} {...rest}>
        {children}
      </Comp>
    );
  },
);
StaggerItem.displayName = "StaggerItem";
