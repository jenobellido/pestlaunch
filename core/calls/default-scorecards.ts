import type { ScorecardDefinition as Scorecard, ScorecardItem } from "./types";

// Transcribed from the "CALL PROCESS SCORECARD" (office manual) and "SALES CALL
// SCORECARD" (sales manual). Sections follow the manuals' four steps: Validate,
// Understand, Solve, Verify. Each item's criteria paraphrase the manual's
// definition of that step, so the grader and managers judge by the same rule.

const item = (name: string, criteria: string): ScorecardItem => ({ name, criteria });

const validate = [
  item(
    "Validate",
    "Early on, acknowledges the customer's specific reason for calling with genuine empathy (names the actual situation, not a vague 'sorry about that').",
  ),
  item(
    "Confidence Statement",
    "Clearly tells the customer they can help and will take care of it, putting the customer at ease (e.g. 'I can definitely take care of this for you').",
  ),
  item(
    "Expectation Statement",
    "Before asking questions, tells the customer what happens next (e.g. 'I'm going to ask you a few questions so I can...').",
  ),
];

const understand = [
  item(
    "Investigate",
    "Asks questions, mostly open-ended (who, what, when, where, why, how), to understand the situation and its root cause before solving it.",
  ),
  item(
    "Summary Statement",
    "Repeats back what the customer needs or values in their own terms and checks it's right (e.g. 'So it sounds like you're looking for... does that sound right?').",
  ),
  item(
    "Expectation Statement",
    "Before presenting the solution, prepares the customer for what's next (e.g. 'I'll walk you through... then we'll get you scheduled').",
  ),
];

const solve = [
  item(
    "Present Solution",
    "Explains the solution in specific detail tailored to this customer: what will be done, how, and why it matters for their situation.",
  ),
  item(
    "Consensus",
    "Checks the customer agrees or has questions before moving on (e.g. 'Does that work for you?', 'Any questions before we talk price?').",
  ),
  item(
    "Close",
    "Asks for the commitment or confirms the action (books the appointment, sets up the change). When the solution has no cost, agreeing to it counts as the close.",
  ),
];

const conclusion = item(
  "Provide a Conclusion",
  "Wraps up loose ends and sets expectations going forward: confirms details such as date and time, address, notes for the technician or what happens next.",
);
const thank = item("Thank the Customer", "Genuinely thanks the customer near the end of the call.");
const finalInformation = item(
  "Offer final information",
  "Invites the customer to call for any other pest needs or questions (one-stop shop); on sales calls, mentions the referral program.",
);

const allCalls: Scorecard = {
  id: "all_calls",
  name: "All Calls",
  thresholds: { gold: 12, green: 11 },
  sections: [
    { title: "Validate", items: validate },
    { title: "Understand", items: understand },
    { title: "Solve", items: solve },
    { title: "Verify", items: [conclusion, thank, finalInformation] },
  ],
};

const retention: Scorecard = {
  id: "retention",
  name: "Retention Calls",
  thresholds: { gold: 12, green: 11 },
  sections: [
    {
      title: "Validate",
      items: [
        item(
          "Validate & Confidence Statement",
          "Acknowledges the customer and says they'll take care of them, without agreeing up front to cancel the account.",
        ),
        item(
          "Transition Statement",
          "Moves the call forward with a short bridge, e.g. asks for the account address and says they'll take a quick look.",
        ),
        item(
          "Do Your Research",
          "Looks into the account and uses what they find: how long they've been a customer, contract, recent services or re-services, past issues.",
        ),
      ],
    },
    {
      title: "Understand",
      items: [
        item(
          "Investigate",
          "Asks open-ended questions to find the real reason for cancelling, without interrogating or asking too many.",
        ),
        item(
          "Validate & Summary Statement",
          "Repeats back their understanding of the reason for cancelling and validates it (e.g. 'So the service has been good, but lately you're seeing more ants?').",
        ),
        item(
          "Validate & Expectation Statement",
          "Stays on the customer's side and prepares them for options (e.g. 'Let me offer a couple of options and you tell me what you think').",
        ),
      ],
    },
    {
      title: "Solve",
      items: [
        item(
          "Present Solution",
          "Offers a specific solution tailored to the root cause to keep the customer: free re-service, back-to-back services, a set technician or time, a pause, a waived payment or a price drop.",
        ),
        item("Consensus", "Asks whether the solution works for the customer (e.g. 'How does that sound?')."),
        item(
          "Repeat (when necessary)",
          "If the first offer is declined, asks more questions and offers another solution. Passes if the first offer was accepted.",
        ),
      ],
    },
    {
      title: "Verify",
      items: [
        conclusion,
        thank,
        item(
          "Leave a Teaser",
          "For a customer who still cancels, ends with an incentive to come back (e.g. a free initial service if they return). Passes if the customer was kept.",
        ),
      ],
    },
  ],
};

const sales: Scorecard = {
  id: "sales",
  name: "Sales Calls",
  thresholds: { gold: 17, green: 14 },
  sections: [
    { title: "Validate", items: validate },
    { title: "Understand", items: understand },
    { title: "Solve", items: solve },
    {
      title: "Pricing",
      items: [
        item(
          "Pricing",
          "Presents price after building value: the regular (anchor) price first, then the sale price with any discount, then moves on to a close.",
        ),
      ],
    },
    {
      title: "Objections",
      autoAwardWhenNotApplicable: true,
      items: [
        item("Agree", "When the customer objects, first agrees with or acknowledges their point of view, with no debate."),
        item(
          "Restate & Insinuate",
          "Restates the objection in their own words and suggests a possible reason, so the customer confirms the real concern.",
        ),
        item("Resolve", "Addresses the concern with a solution and builds more value."),
        item(
          "Re-Close",
          "Confidently asks for the sale again after resolving the objection, in a low-pressure way. Passes if the customer commits on their own right after the concern is resolved.",
        ),
      ],
    },
    { title: "Verify", items: [conclusion, finalInformation, thank] },
  ],
};

/** The manuals' scorecards, keyed by id. Companies start with these and can edit them. */
export const DEFAULT_SCORECARDS = {
  all_calls: allCalls,
  retention,
  sales,
} as const satisfies Record<string, Scorecard>;
