import Link from "next/link";
import { ArrowRight, AudioLines, Check } from "lucide-react";
import { primaryButton, secondaryButton } from "@/shared/ui/button";
import { Stagger, StaggerItem } from "@/shared/ui/motion";

const PROMISES = ["Scored on your own call manual", "Coaching for every rep", "Private by default"];

/** The hero: one centred column, so the product preview right below it is the picture. */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* A faint grid fading out from the top, under a soft blue glow. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_0%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_75%)]"
        aria-hidden
      />
      <Stagger
        trigger="mount"
        stagger={0.1}
        delay={0.05}
        className="mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20 lg:pt-28"
      >
        <StaggerItem>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card/60 py-1 pr-3 pl-1 text-xs text-muted backdrop-blur">
            <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">
              <AudioLines className="size-3.5" aria-hidden />
              Call Intelligence
            </span>
            Built for pest control offices
          </span>
        </StaggerItem>
        <StaggerItem>
          <h1 className="mt-7 text-[2.45rem] leading-[1.04] font-medium tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
            <span className="block">Every call scored.</span> <span className="block text-accent">Every rep coached.</span>
          </h1>
        </StaggerItem>
        <StaggerItem>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-muted sm:text-lg">
            PestLaunch transcribes every office call, grades it against your own call manual and writes each rep the
            coaching for what to fix next. You see who&apos;s closing, who&apos;s slipping and which follow-ups are owed.
          </p>
        </StaggerItem>
        <StaggerItem className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/signup" className={`${primaryButton} group h-12 px-6 text-[15px] shadow-[0_12px_32px_-12px_var(--accent)]`}>
            Get started
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <a href="#preview" className={`${secondaryButton} h-12 bg-bg/40 px-6 text-[15px] backdrop-blur`}>
            See a scored call
          </a>
        </StaggerItem>
        <StaggerItem>
          <ul className="mt-8 flex flex-col items-center gap-2.5 text-sm text-muted sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check className="size-2.5" strokeWidth={3} aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </StaggerItem>
      </Stagger>
    </section>
  );
}
