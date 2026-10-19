"use client";

import { AudioLines, ClipboardCheck, MessageSquareText, Upload } from "lucide-react";
import { motion } from "motion/react";
import { EASE_OUT } from "@/shared/ui/motion";
import { SectionHeading } from "./section-heading";

const STAGES = [
  { icon: Upload, verb: "Upload", line: "Drop in a recording, or a whole day of them at once." },
  { icon: AudioLines, verb: "Transcribe", line: "Every word, split by who said it: your rep or the customer." },
  { icon: ClipboardCheck, verb: "Score", line: "Graded step by step on your call manual's scorecard, with the quote that proves it." },
  { icon: MessageSquareText, verb: "Coach", line: "Each rep gets one thing to work on next, with words they can use." },
];

/** The four stages a call goes through, joined by a line that draws itself as you scroll to it. */
export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-panel">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHeading
          eyebrow="How it works"
          title="From a recording to a coaching note in about a minute."
          lede="Upload the recordings you already have, one or a whole day at once. PestLaunch does the listening."
        />

        <div className="relative mt-16">
          {/* The connecting line: horizontal on wide screens, vertical on phones. */}
          <svg className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px overflow-visible md:block" aria-hidden>
            <motion.line
              x1="0"
              y1="0"
              x2="100%"
              y2="0"
              className="stroke-accent"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.2 }}
            />
          </svg>
          <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">
            {STAGES.map(({ icon: Icon, verb, line }, i) => (
              <motion.li
                key={verb}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 + i * 0.12 }}
                className="flex gap-4 md:flex-col md:items-center md:text-center"
              >
                <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-[0_10px_30px_-10px_var(--accent)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted tabular-nums">Step {i + 1}</p>
                  <h3 className="mt-0.5 text-lg font-medium">{verb}</h3>
                  <p className="mt-1.5 max-w-[30ch] text-sm text-pretty text-muted">{line}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
