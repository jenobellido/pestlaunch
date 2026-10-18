"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/** three.js loads only in the browser, after the hero text has painted. */
const HeroScene = dynamic(() => import("./hero-scene").then((m) => m.HeroScene), { ssr: false });

/**
 * The hero: text on one side, the 3D scene filling the rest. As the hero scrolls away the scene
 * tips back and fades, handing over to the product preview below.
 */
export function HeroStage({ children }: { children: React.ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section ref={section} className="relative isolate overflow-hidden">
      {/* A soft glow so the hero has depth before (or without) WebGL. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_45%_at_50%_80%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_70%)] lg:bg-[radial-gradient(60%_55%_at_72%_45%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_70%)]"
        aria-hidden
      />
      <motion.div
        style={{ opacity }}
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[440px] [mask-image:radial-gradient(closest-side,black_72%,transparent)] lg:inset-y-0 lg:right-0 lg:left-[45%] lg:h-auto"
        aria-hidden
      >
        <div className="size-full animate-[landing-fade-in_1.4s_ease-out_0.2s_both]">
          <HeroScene progress={scrollYProgress} />
        </div>
      </motion.div>
      {children}
    </section>
  );
}
