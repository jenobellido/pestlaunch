"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { EASE_OUT } from "@/shared/ui/motion";

/** Rises in on load, then tilts from leaning back to flat as it scrolls into view. */
export function Tilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 20%"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);

  return (
    <div ref={ref} style={{ perspective: 1800 }}>
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 1, ease: EASE_OUT }}
      >
        <motion.div style={reduce ? undefined : { rotateX, scale, transformOrigin: "50% 0%" }}>{children}</motion.div>
      </motion.div>
    </div>
  );
}
