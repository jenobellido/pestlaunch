import { Building2, LockKeyhole, Trash2 } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/shared/ui/motion";

const FACTS = [
  {
    icon: LockKeyhole,
    title: "Recordings stay private",
    text: "Kept in private storage. Only your team can play them, through links that expire.",
  },
  {
    icon: Building2,
    title: "Your company is walled off",
    text: "Every call belongs to one company and is only ever read through it.",
  },
  {
    icon: Trash2,
    title: "Delete means gone",
    text: "Deleting a call removes its recording, transcript and score together.",
  },
];

export function Privacy() {
  return (
    <section id="privacy" className="scroll-mt-20 border-y border-line bg-panel">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <Reveal>
          <h2 className="text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
            Your customers&apos; calls stay yours.
          </h2>
          <p className="mt-4 max-w-md text-muted">
            Calls hold names, addresses and card details. They&apos;re treated that way from the moment you upload one.
          </p>
        </Reveal>
        <Stagger as="ul" className="flex flex-col gap-8">
          {FACTS.map(({ icon: Icon, title, text }) => (
            <StaggerItem as="li" key={title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card text-accent">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
