import type { CoachingFeedback } from "@/modules/coaching";
import type { ScorecardResult } from "@/modules/scorecards";

// An invented call for the landing page preview. Names, address and words are made up; no real
// call content belongs here (see CLAUDE.md).

export const demoCall = {
  title: "Termite inspection, new customer",
  rep: "Marisol Vega",
  length: "6:42",
  when: "Tue, 9:14 AM",
  summary:
    "Dana called about mud tubes along her garage wall. Marisol explained the inspection, quoted the termite plan and booked Thursday morning.",
};

/** Who spoke when, as shares of the call, for the speaker timeline. */
export const demoTimeline: { speaker: "rep" | "customer"; share: number }[] = [
  { speaker: "rep", share: 6 },
  { speaker: "customer", share: 9 },
  { speaker: "rep", share: 4 },
  { speaker: "customer", share: 12 },
  { speaker: "rep", share: 14 },
  { speaker: "customer", share: 5 },
  { speaker: "rep", share: 18 },
  { speaker: "customer", share: 4 },
  { speaker: "rep", share: 11 },
  { speaker: "customer", share: 7 },
  { speaker: "rep", share: 10 },
];

export const demoTranscript: { speaker: "rep" | "customer"; time: string; text: string }[] = [
  { speaker: "rep", time: "0:02", text: "Thanks for calling Northside Pest, this is Marisol. How can I help?" },
  { speaker: "customer", time: "0:06", text: "Hi, I found these little mud tubes running up my garage wall." },
  { speaker: "rep", time: "0:11", text: "I'm glad you called right away. Those can be termites, and we'll find out for sure." },
  { speaker: "customer", time: "4:58", text: "Thursday morning works. Do I need to be home?" },
];

const step = (section: string, item: string, passed: boolean, evidence: string | null = null) => ({
  section,
  item,
  passed,
  evidence,
  reason: passed ? "Done clearly on the call." : "Not heard on the call.",
});

export const demoScorecard: ScorecardResult = {
  scorecardId: "sales",
  points: 15,
  maxPoints: 17,
  grade: "green",
  items: [
    step("Validate", "Validate", true, "I'm glad you called right away"),
    step("Validate", "Confidence Statement", true, "we'll find out for sure"),
    step("Validate", "Expectation Statement", true),
    step("Understand", "Investigate", true),
    step("Understand", "Summary Statement", false),
    step("Understand", "Expectation Statement", true),
    step("Solve", "Present Solution", true),
    step("Solve", "Consensus", true),
    step("Solve", "Close", true),
    step("Pricing", "Pricing", true),
    step("Objections", "Agree", true),
    step("Objections", "Restate & Insinuate", true),
    step("Objections", "Resolve", true),
    step("Objections", "Re-Close", false),
    step("Verify", "Provide a Conclusion", true),
    step("Verify", "Offer final information", true),
    step("Verify", "Thank the Customer", true),
  ],
};

export const demoCoaching: CoachingFeedback = {
  focus: "Sum up what you heard before you present the plan.",
  strengths: ["Calm, confident opening that put Dana at ease.", "Booked a firm time before hanging up."],
  improvements: [
    {
      point: "Missed the summary statement",
      quote: null,
      suggestion: "\"So you've seen tubes on the garage wall since last week, and you want to know if it's termites.\"",
    },
  ],
};
