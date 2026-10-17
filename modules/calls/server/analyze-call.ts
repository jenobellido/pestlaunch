import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import { CALL_TYPES, type CallType, type TranscriptSegment } from "@/core/calls";
import { formatTimestamp } from "../lib/format";
import type { CallOutcome, CallResolution } from "../model/types";

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
  summary: z.string().describe("2 to 3 plain sentences: why they called, what happened, how it ended"),
  resolution: z.enum(RESOLUTIONS),
  details: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("Key facts stated in the call, most important first, at most 8"),
  followUps: z.array(z.string()).describe("Concrete actions the office still has to take; empty if none"),
});

// Call types and outcomes follow the PestLaunch office and sales call manuals.
const SYSTEM = `You review recorded phone calls for a pest control company and report what happened, for the owner and office manager.

Call types (pick the caller's real purpose, not the phone menu option they chose):
- new_customer: someone who isn't a customer yet asks about service: a quote, inspection or signing up. Inbound sales.
- scheduling: setting, moving or asking about a service appointment, or special needs for an upcoming visit.
- billing: invoices, payments, charges, balances, declined cards, updating the card on file.
- reservice: an existing customer still has pests after a treatment and needs a technician to come back.
- retention: the customer wants to cancel or stop service, including when the company calls back about a cancel request.
- other: anything else, e.g. changing service address, technician feedback, vendors, wrong numbers, or a voicemail.

Resolution (how the call ended):
- booked: a new customer agreed to service, or a new visit (initial, re-service, inspection) was put on the schedule.
- retained: the customer wanted to cancel but is staying, including a pause, plan change or discount.
- cancelled: the service was cancelled or will be.
- resolved: the request was fully handled on the call (rescheduled, card updated, question answered).
- follow_up_needed: the company still owes an action: a callback, manager approval, sending something, waiting on the customer.
- unresolved: the caller's need wasn't met and no next step was agreed (e.g. declined the quote, call dropped).

Details: only facts actually said in the call, never guesses. Use these labels when they apply: Pest, Service plan, Price quoted, Appointment, Technician, Cancellation reason, Retention offer, Payment, Customer name, Service address. Keep each value short. Write dates and times the way they were said (e.g. "Tuesday the 22nd, 1-3 pm"); never add a year, weekday or date that wasn't said.

Follow-ups: only actions the employee promised or that clearly remain open in the call (e.g. "send the service agreement", "call back after manager approval"). Don't invent routine tasks. Leave it empty when nothing is left to do.

The transcript speaker labels were added automatically and can occasionally be wrong; use the content to judge who said what.`;

function transcriptText(segments: readonly TranscriptSegment[]) {
  const name = { employee: "Employee", customer: "Customer", unknown: "Other" } as const;
  return segments.map((s) => `[${formatTimestamp(s.start)}] ${name[s.speaker]}: ${s.text}`).join("\n");
}

/** Classifies the call and extracts the outcome and key details. */
export async function analyzeCall(transcript: readonly TranscriptSegment[]): Promise<CallAnalysis> {
  const result = await generateObject({
    name: "call_analysis",
    schema: analysisSchema,
    system: SYSTEM,
    prompt: `Analyze this call.\n\n${transcriptText(transcript)}`,
  });

  return {
    callType: result.callType,
    employeeName: result.employeeName?.trim() || null,
    outcome: {
      summary: result.summary.trim(),
      resolution: result.resolution,
      details: result.details.filter((d) => d.label.trim() && d.value.trim()).slice(0, 8),
      followUps: result.followUps.map((f) => f.trim()).filter(Boolean),
    },
  };
}
