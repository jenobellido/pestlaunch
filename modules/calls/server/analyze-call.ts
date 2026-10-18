import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import { CALL_TYPES, type CallType, type TranscriptSegment } from "@/core/calls";
import { formatTimestamp } from "../lib/format";
import { CANCEL_REASONS, type CallOutcome, type CallResolution } from "../model/types";

export interface CallAnalysis {
  callType: CallType;
  employeeName: string | null;
  outcome: CallOutcome;
}

const RESOLUTIONS = [
  "booked",
  "retained",
  "cancelled",
  "resolved",
  "follow_up_needed",
  "unresolved",
] as const satisfies readonly CallResolution[];

const analysisSchema = z.object({
  callType: z.enum(CALL_TYPES),
  employeeName: z.string().nullable().describe("The employee's first name as said in the call, or null"),
  summary: z
    .string()
    .describe("2 to 3 plain sentences: who called whom and why, what happened, how it ended. Say \"the company\", never its name"),
  resolution: z.enum(RESOLUTIONS),
  details: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("Key facts stated in the call, most important first, at most 6, no repeats"),
  followUps: z.array(z.string()).describe("Concrete actions the office still has to take; empty if none"),
  cancelReason: z
    .enum(CANCEL_REASONS)
    .nullable()
    .describe("Retention calls only: the main reason the customer wanted to cancel; null for other calls"),
});

// Call types and outcomes follow the PestLaunch office and sales call manuals.
const SYSTEM = `You review recorded phone calls for a pest control company and report what happened, for the owner and office manager.

Call types (pick the caller's real purpose, not the phone menu option they chose):
- new_customer: someone who isn't a customer yet asks about service: a quote, inspection or signing up. Inbound sales.
- scheduling: setting, moving or asking about a service appointment, or special needs for an upcoming visit. Includes a new customer whose sale was already agreed (e.g. by email or a web form) when the call only arranges the timing or payment.
- billing: invoices, payments, charges, balances, declined cards, updating the card on file.
- reservice: an existing customer still has pests after a treatment and needs a technician to come back.
- retention: the customer wants to cancel or stop service, including when the company calls back about a cancel request.
- other: anything else, e.g. changing service address, technician feedback, vendors, wrong numbers, or a voicemail.

Resolution (how the call ended):
- booked: a new customer agreed to service, or a new visit (initial, re-service, inspection) was put on the schedule.
- retained: the customer wanted to cancel but is staying, including a pause, plan change or discount.
- cancelled: the service was cancelled or will be.
- resolved: the request was fully handled on the call (rescheduled, card updated, question answered). A new customer who got a quote or price but didn't book is never resolved: use follow_up_needed if they'll get back to us or we'll follow up, unresolved if they declined.
- follow_up_needed: the company still owes an action: a callback, manager approval, sending something, waiting on the customer.
- unresolved: the caller's need wasn't met and no next step was agreed (e.g. declined the quote, call dropped).

Company: the summary is read by the company itself, so call it "the company", never by name (the transcript often mishears the name).

Direction: decide who placed the call. Inbound calls usually open with the employee answering with the company name; on outbound calls the employee introduces themselves after the customer says "hello". Say it right in the summary ("The employee called the customer to...").

Details: only facts actually said in the call, never guesses. Each fact once; don't repeat the summary, the appointment in other words, or describe the employee's manner (no "Apology" or "Confirmation" entries). Use these labels when they apply: Pest, Service plan, Price quoted, Appointment, Technician, Notes for technician, Cancellation reason, Retention offer, Payment, Customer name, Service address. Use a label only for that kind of fact: a street address goes under Service address, a person under Customer name, and access, location or on-site requests (gate codes, pets, where to park, what to bring) under Notes for technician. Never use a label twice; combine the values. Price quoted only for a price the employee actually stated. When a name is spelled out letter by letter, use that spelling. Never write card numbers, expiry dates or security codes; "[redacted]" in the transcript marks card details that were removed. Keep each value short. Write dates and times the way they were said (e.g. "Tuesday the 22nd, 1-3 pm"); never add a year, weekday or date that wasn't said.

Follow-ups: write them as the office's own actions. When waiting on the customer, write our next step ("send the quote", "follow up if no reply by Monday"), not the customer's task, and don't list a visit that's already scheduled. Include every action the employee promised or that clearly remains open, even when an appointment was booked: anything they said they'd send, call back about, tell the technician, or have collected at the visit (e.g. "send the service agreement", "call back after manager approval", "note the gate code for the technician", "call if an earlier slot opens", "technician to collect payment at the visit", "follow up Monday on the quote"). Don't invent routine tasks. Leave it empty when nothing is left to do, but a "follow_up_needed" resolution always has at least one.

Cancel reason (retention calls only, else null): the customer's main reason, even if they were saved. Price = cost or budget; No longer needed = no pests anymore or the problem is solved; Service quality = pests came back, missed or late visits, technician issues; Moving = selling or leaving the area; Switching company = going to a competitor or doing it themselves; Scheduling = visit times don't work; Other = anything else, such as a death in the family.

The transcript speaker labels were added automatically and can occasionally be wrong; use the content to judge who said what.`;

function transcriptText(segments: readonly TranscriptSegment[]) {
  const name = { employee: "Employee", customer: "Customer", unknown: "Other" } as const;
  return segments.map((s) => `[${formatTimestamp(s.start)}] ${name[s.speaker]}: ${s.text}`).join("\n");
}

/** Classifies the call and extracts the outcome and key details. */
export async function analyzeCall(
  transcript: readonly TranscriptSegment[],
  options: { teamNames?: readonly string[] } = {},
): Promise<CallAnalysis> {
  // The transcript often mishears names; the team list gives the right spelling.
  const team = options.teamNames?.length
    ? `The company's team, for spelling the employee's name: ${options.teamNames.join(", ")}. Use one of these only if it clearly matches the name said.\n\n`
    : "";
  const result = await generateObject({
    name: "call_analysis",
    schema: analysisSchema,
    system: SYSTEM,
    prompt: `${team}Analyze this call.\n\n${transcriptText(transcript)}`,
  });

  return {
    callType: result.callType,
    employeeName: result.employeeName?.trim() || null,
    outcome: {
      summary: result.summary.trim(),
      resolution: result.resolution,
      details: result.details.filter((d) => d.label.trim() && d.value.trim()).slice(0, 8),
      followUps: result.followUps.map((f) => f.trim()).filter(Boolean),
      cancelReason: result.callType === "retention" ? result.cancelReason : null,
    },
  };
}
