import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { primaryButton } from "@/shared/ui/button";
import { Reveal } from "@/shared/ui/motion";

const BARS = [4, 7, 5, 9, 6, 11, 8, 13, 9, 15, 11, 13, 9, 11, 7, 9, 6, 8, 5, 7, 4];

export function Closing() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* A row of sound bars breathing behind the call to action. */}
      <div className="absolute inset-x-0 top-1/2 -z-10 flex h-56 -translate-y-1/2 items-center justify-center gap-2 opacity-35 [mask-image:radial-gradient(60%_60%_at_50%_50%,transparent_35%,black_80%)] sm:gap-3" aria-hidden>
        {BARS.map((h, i) => (
          <span
            key={i}
            className="landing-bar w-2 rounded-full bg-accent sm:w-3"
            style={{ height: `${h * 6}%`, animationDelay: `${(i % 6) * -0.31}s` }}
          />
        ))}
      </div>
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center px-4 py-28 text-center sm:px-6 lg:py-36">
        <h2 className="text-4xl leading-tight font-medium tracking-tight text-balance sm:text-5xl">
          Hear every call without listening to every call.
        </h2>
        <p className="mt-4 max-w-md text-muted">Set up your company in a minute and upload your first recording today.</p>
        <Link href="/signup" className={`${primaryButton} group mt-8 h-12 px-6`}>
          Get started
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </Reveal>
    </section>
  );
}
