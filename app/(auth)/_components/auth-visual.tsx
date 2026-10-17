import { Check, X } from "lucide-react";

// Decorative preview of a scored call. The content is invented, not taken from a real call.
const ITEMS = [
  { label: "Greeted with company name", passed: true },
  { label: "Confirmed service address", passed: true },
  { label: "Offered the recurring plan", passed: false },
  { label: "Booked the appointment", passed: true },
];

const WAVE = [6, 14, 22, 12, 28, 18, 34, 20, 10, 26, 16, 30, 12, 22, 8, 18, 24, 14, 6, 12];

export function AuthVisual() {
  return (
    <aside className="relative m-3 hidden overflow-hidden rounded-[36px] bg-panel lg:flex lg:flex-col" aria-hidden>
      <div className="p-12">
        <p className="max-w-sm text-3xl leading-tight font-medium tracking-tight">
          Every call, transcribed and scored. <span className="text-accent">Coaching that writes itself.</span>
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-12 pb-12">
        <div className="w-full max-w-md rotate-[-2deg] space-y-3">
          <div className="rounded-[28px] bg-card p-6 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New customer call</p>
                <p className="text-sm text-muted">4:12 · Office</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-badge-success px-2.5 py-0.5 text-xs font-medium text-on-badge-success">
                Booked
              </span>
            </div>
            <div className="mt-5 flex h-9 items-end gap-1">
              {WAVE.map((h, i) => (
                <span key={i} className="flex-1 rounded-full bg-accent/70" style={{ height: h }} />
              ))}
            </div>
          </div>

          <div className="ml-10 rotate-[3deg] rounded-[28px] bg-card p-6 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45)]">
            <div className="flex items-baseline justify-between">
              <p className="font-medium">All Calls scorecard</p>
              <p className="text-2xl font-medium tabular-nums">
                9<span className="text-base text-muted">/10</span>
              </p>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {ITEMS.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5">
                  {item.passed ? (
                    <Check className="size-4 text-accent" />
                  ) : (
                    <X className="size-4 text-danger" />
                  )}
                  <span className={item.passed ? "text-fg/85" : "text-muted"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
