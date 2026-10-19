import { Badge } from "@/shared/ui/card";
import { Stagger, StaggerItem } from "@/shared/ui/motion";
import { SectionHeading } from "./section-heading";

// The questions owners asked in PestLaunch's walkthrough, and where the app answers them.
const QUESTIONS: { question: string; answer: string; shows: { label: string; dot: string }[] }[] = [
  {
    question: "Are we closing our sales calls?",
    answer: "Every new-customer call is graded on the sales scorecard, so you see who books, who quotes and stalls, and why.",
    shows: [
      { label: "Booked", dot: "bg-success" },
      { label: "Quoted, no booking", dot: "bg-orange" },
    ],
  },
  {
    question: "How many cancels did we save?",
    answer: "Cancel calls are scored on the retention script. Saved and lost sit side by side, with the reason each customer gave.",
    shows: [
      { label: "Saved", dot: "bg-success" },
      { label: "Cancelled: price", dot: "bg-danger" },
    ],
  },
  {
    question: "What should I train on this week?",
    answer: "The steps your team misses most rise to the top, each linked to the moment in the call where it slipped.",
    shows: [{ label: "Summary statement missed on 6 calls", dot: "bg-orange" }],
  },
  {
    question: "Which follow-ups are slipping?",
    answer: "Promised callbacks and quotes are pulled from the call itself and stay on the list until someone closes them out.",
    shows: [{ label: "Callback promised for Friday", dot: "bg-orange" }],
  },
];

export function Questions() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-32">
      <SectionHeading
        className="lg:sticky lg:top-28 lg:self-start"
        eyebrow="For owners"
        title="The questions you ask about your phones, answered every morning."
        lede="No more listening back to hours of calls or guessing from a gut feeling. Open PestLaunch and it's there."
      />
      <Stagger as="ul" className="flex flex-col divide-y divide-line border-y border-line">
        {QUESTIONS.map((q, i) => (
          <StaggerItem
            as="li"
            key={q.question}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] py-8 first:pt-6 last:pb-6 sm:grid-cols-[3rem_minmax(0,1fr)]"
          >
            <span className="pt-1.5 text-sm font-medium text-accent tabular-nums">0{i + 1}</span>
            <div>
              <h3 className="text-xl font-medium sm:text-2xl">{q.question}</h3>
              <p className="mt-3 max-w-[60ch] text-pretty text-muted">{q.answer}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {q.shows.map((s) => (
                  <Badge key={s.label} dot={s.dot}>
                    {s.label}
                  </Badge>
                ))}
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
