import type { Scorecard, ScorecardId } from "../model/types";

// Transcribed from the "CALL PROCESS SCORECARD" (office manual) and
// "SALES CALL SCORECARD" (sales manual).

const allCalls: Scorecard = {
  id: "all_calls",
  name: "All Calls",
  thresholds: { gold: 12, green: 11 },
  sections: [
    { title: "Validate", items: ["Validate", "Confidence Statement", "Expectation Statement"] },
    { title: "Investigate", items: ["Investigate", "Summary Statement", "Expectation Statement"] },
    { title: "Solve", items: ["Present Solution", "Consensus", "Close"] },
    { title: "Conclude", items: ["Provide a Conclusion", "Thank the Customer", "Offer final information"] },
  ],
};

const retention: Scorecard = {
  id: "retention",
  name: "Retention Calls",
  thresholds: { gold: 12, green: 11 },
  sections: [
    { title: "Validate", items: ["Validate & Confidence Statement", "Transition Statement", "Do Your Research"] },
    { title: "Understand", items: ["Investigate", "Validate & Summary Statement", "Validate & Expectation Statement"] },
    { title: "Solve", items: ["Present Solution", "Consensus", "Repeat (when necessary)"] },
    { title: "Verify", items: ["Provide a Conclusion", "Thank the Customer", "Leave a Teaser"] },
  ],
};

const sales: Scorecard = {
  id: "sales",
  name: "Sales Calls",
  thresholds: { gold: 17, green: 14 },
  sections: [
    { title: "Validate", items: ["Validate", "Confidence Statement", "Expectation Statement"] },
    { title: "Investigate", items: ["Investigate", "Summary Statement", "Expectation Statement"] },
    { title: "Solve", items: ["Present Solution", "Consensus", "Close"] },
    { title: "Pricing", items: ["Pricing"] },
    {
      title: "Objections",
      items: ["Agree", "Restate & Insinuate", "Resolve", "Re-Close"],
      autoAwardWhenNotApplicable: true,
    },
    { title: "Conclude", items: ["Provide a Conclusion", "Offer final information", "Thank the Customer"] },
  ],
};

export const SCORECARDS: Record<ScorecardId, Scorecard> = {
  all_calls: allCalls,
  retention,
  sales,
};
