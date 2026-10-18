"use client";

import { MotionConfig, motion, type Variants } from "motion/react";

/** Expo-out curve used for every entrance, so everything moves the same way. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Honors the OS reduced-motion setting: transforms are dropped, opacity fades stay. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

const container = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const item = (distance: number, duration: number): Variants => ({
  hidden: { opacity: 0, y: distance },
  show: { opacity: 1, y: 0, transition: { duration, ease: EASE_OUT } },
});

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul";
  /** "mount" plays on load (above the fold); "view" plays when scrolled into view. */
  trigger?: "mount" | "view";
  stagger?: number;
  delay?: number;
}

/** Children (StaggerItem) rise in one after another. */
export function Stagger({ children, className, as = "div", trigger = "view", stagger = 0.08, delay = 0 }: StaggerProps) {
  const Component = as === "ul" ? motion.ul : motion.div;
  const play =
    trigger === "mount" ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount: 0.2 } };
  return (
    <Component className={className} variants={container(stagger, delay)} initial="hidden" {...play}>
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
  distance = 20,
  duration = 0.7,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
  distance?: number;
  duration?: number;
}) {
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component className={className} variants={item(distance, duration)}>
      {children}
    </Component>
  );
}

/** A single block that rises in when scrolled into view. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
