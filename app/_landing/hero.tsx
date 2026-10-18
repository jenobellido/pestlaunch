import Link from "next/link";
import { ArrowRight, AudioLines } from "lucide-react";
import { primaryButton, secondaryButton } from "@/shared/ui/button";
import { Stagger, StaggerItem } from "@/shared/ui/motion";
import { HeroStage } from "./hero-stage";

export function Hero() {
  return (
    <HeroStage>
      <Stagger
        trigger="mount"
        stagger={0.1}
        delay={0.05}
        className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col justify-start px-4 pt-14 pb-[460px] sm:px-6 sm:pt-20 lg:justify-center lg:pt-10 lg:pb-24"
      >
        <div className="max-w-xl">
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card/60 px-3 py-1 text-xs text-muted backdrop-blur">
              <AudioLines className="size-3.5 text-accent" aria-hidden />
              Call Intelligence for pest control
            </span>
          </StaggerItem>
          <StaggerItem>
            <h1 className="mt-6 text-[2.6rem] leading-[1.04] font-medium tracking-tight text-balance sm:text-6xl">
              Every call scored. <span className="text-accent">Every rep coached.</span>
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-5 max-w-md text-base text-pretty text-muted sm:text-lg">
              PestLaunch listens to your office calls, grades each one on your scorecard and tells every rep what to
              fix next.
            </p>
          </StaggerItem>
          <StaggerItem className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={`${primaryButton} group h-12 px-6`}>
              Get started
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a href="#how" className={`${secondaryButton} h-12 bg-bg/40 px-6 backdrop-blur`}>
              See how it works
            </a>
          </StaggerItem>
        </div>
      </Stagger>
    </HeroStage>
  );
}
