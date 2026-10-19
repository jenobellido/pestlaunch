import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { primaryButton, secondaryButton } from "@/shared/ui/button";
import { Reveal } from "@/shared/ui/motion";

const BARS = [4, 7, 5, 9, 6, 11, 8, 13, 9, 15, 11, 13, 9, 11, 7, 9, 6, 8, 5, 7, 4];

export function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
      <Reveal className="relative isolate overflow-hidden rounded-[36px] border border-line bg-[radial-gradient(90%_120%_at_50%_0%,color-mix(in_oklab,var(--accent)_22%,var(--card)),var(--card)_70%)]">
        {/* A row of sound bars breathing behind the call to action. */}
        <div
          className="absolute inset-x-0 bottom-0 -z-10 flex h-40 items-end justify-center gap-2 opacity-30 [mask-image:linear-gradient(to_top,black,transparent)] sm:gap-3"
          aria-hidden
        >
          {BARS.map((h, i) => (
            <span
              key={i}
              className="landing-bar w-2 rounded-full bg-accent sm:w-3"
              style={{ height: `${h * 6}%`, transformOrigin: "bottom", animationDelay: `${(i % 6) * -0.31}s` }}
            />
          ))}
        </div>
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center sm:py-24">
          <h2 className="text-4xl leading-[1.05] font-medium tracking-[-0.03em] text-balance sm:text-5xl">
            Hear every call without listening to every call.
          </h2>
          <p className="mt-5 max-w-md text-base text-pretty text-muted sm:text-lg">
            Set up your company in a minute, load example calls to look around, and upload your first recording today.
          </p>
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/signup" className={`${primaryButton} group h-12 px-6 text-[15px] shadow-[0_12px_32px_-12px_var(--accent)]`}>
              Get started
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="/login" className={`${secondaryButton} h-12 bg-bg/40 px-6 text-[15px]`}>
              Log in
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
