import "server-only";
import { z } from "zod";
import { generateObject, transcribeAudio, type WhisperSegment } from "@/core/ai";
import type { Speaker, TranscriptSegment } from "@/core/calls";
import { formatTimestamp } from "../lib/format";
import { countWords, isExactSplit, isSpeech, MIN_WORDS, mergeTurns, splitSegment } from "../lib/transcript";

export interface TranscriptionResult {
  durationSec: number;
  segments: TranscriptSegment[];
}

// Biases Whisper towards the words these calls use, so they're spelled right.
const VOCABULARY =
  "Pest control office phone call between an employee and a customer. " +
  "Termites, rodents, mice, roaches, ants, spiders, mosquitoes, bed bugs, wasps, " +
  "pest-free, quarterly service, re-service, initial service, technician, inspection, treatment, " +
  "recurring plan, autopay, invoice, cancellation.";

const SPEAKER = z.enum(["employee", "customer", "unknown"]);

// Flat on purpose: every line is just a number and a speaker, and the rare split lines are
// listed separately. Smaller fallback models follow this shape far more reliably.
const speakerLabels = z.object({
  lines: z.array(
    z.object({
      line: z.number().int().describe("The line number in brackets"),
      speaker: SPEAKER.describe("Who says this line, or most of it"),
    }),
  ),
  splits: z
    .array(
      z.object({
        line: z.number().int(),
        pieces: z.array(z.object({ speaker: SPEAKER, text: z.string() })),
      }),
    )
    .describe("Only lines that hold two speakers: the line's exact words, in order, cut into pieces. Usually empty"),
});

const SPEAKER_SYSTEM = `You label who is speaking in a phone call transcript from a pest control company.

The employee works for the pest control company (office staff, sales or a technician). The customer is a homeowner, business or prospect. Calls can be inbound (the employee usually answers with the company name) or outbound (the employee calls the customer, and the customer answers with "hello").

Rules:
- Label every numbered line in the "Label these lines" section exactly once, in order. Lines in the context sections are only there to help; don't label them.
- "unknown" is only for recorded messages, phone menus, voicemail greetings and hold messages, or a third person who is neither.
- Use the conversation to decide: who asks for the address and offers appointments is the employee; who describes the pest problem at their home is the customer.
- The transcription sometimes puts two speakers' words on one line. Only then, add that line to "splits" with its exact words, in order, cut into consecutive pieces with a speaker each. Don't change, add or drop any words. Most calls need no splits.`;

/** Lines per labelling request. Smaller requests come back complete and valid more reliably. */
const CHUNK = 40;
/** Lines from the start of the call shown with every chunk: the greeting reveals who's who. */
const OPENING = 8;
/** Lines just before a chunk, shown so a turn that spans the boundary keeps its speaker. */
const OVERLAP = 6;
/** Chunks labelled at once. Low, because the free AI tier allows few tokens per minute. */
const CONCURRENCY = 2;

const numbered = (segments: WhisperSegment[], from: number) =>
  segments.map((s, i) => `[${from + i}] (${formatTimestamp(s.start)}) ${s.text.trim()}`).join("\n");

/** One line's speaker, or several pieces when it holds more than one turn. */
type LineLabel = { speaker: Speaker; pieces?: { speaker: Speaker; text: string }[] };

async function labelChunk(segments: WhisperSegment[], from: number): Promise<Map<number, LineLabel>> {
  const chunk = segments.slice(from, from + CHUNK);
  const context: string[] = [];
  if (from > 0) context.push(`Start of the call (context):\n${numbered(segments.slice(0, Math.min(OPENING, from)), 0)}`);
  const overlapFrom = Math.max(OPENING, from - OVERLAP);
  if (from > overlapFrom) context.push(`Just before (context):\n${numbered(segments.slice(overlapFrom, from), overlapFrom)}`);

  const { lines, splits } = await generateObject({
    name: "speaker_labels",
    schema: speakerLabels,
    system: SPEAKER_SYSTEM,
    check: ({ lines: labelled }) => {
      const seen = new Set(labelled.map((l) => l.line));
      const missing = chunk.map((_, i) => from + i).filter((n) => !seen.has(n));
      return missing.length ? `lines ${missing.join(", ")} weren't labelled` : null;
    },
    // Low effort mislabelled turns on the smaller fallback model; labels feed every later step.
    reasoningEffort: "medium",
    prompt: [...context, `Label these lines (${from} to ${from + chunk.length - 1}):\n${numbered(chunk, from)}`].join("\n\n"),
  });

  const inChunk = (line: number) => line >= from && line < from + chunk.length;
  const labels = new Map<number, LineLabel>();
  for (const l of lines) if (inChunk(l.line)) labels.set(l.line, { speaker: l.speaker });
  for (const s of splits) {
    const original = segments[s.line];
    const label = labels.get(s.line);
    if (!original || !label || !inChunk(s.line)) continue;
    // Accept a split only if its pieces are exactly the line's words, so nothing is invented.
    if (isExactSplit(s.pieces, original.text)) label.pieces = s.pieces;
  }
  return labels;
}

/** Asks the model who says each Whisper segment. Lines it skips fall back to "unknown". */
async function labelSpeakers(segments: WhisperSegment[]): Promise<TranscriptSegment[]> {
  const starts = Array.from({ length: Math.ceil(segments.length / CHUNK) }, (_, i) => i * CHUNK);
  const labels = new Map<number, LineLabel>();
  for (let i = 0; i < starts.length; i += CONCURRENCY) {
    const batch = await Promise.all(starts.slice(i, i + CONCURRENCY).map((from) => labelChunk(segments, from)));
    for (const m of batch) for (const [line, label] of m) labels.set(line, label);
  }

  return segments.flatMap((s, i) => {
    const label = labels.get(i) ?? { speaker: "unknown" as const };
    const text = s.text.trim();
    return label.pieces ? splitSegment(s, label.pieces) : [{ speaker: label.speaker, start: s.start, end: s.end, text }];
  });
}

/** Speech to text with speaker labels (employee vs customer). */
export async function transcribe(audio: File): Promise<TranscriptionResult> {
  const whisper = await transcribeAudio(audio, { prompt: VOCABULARY });
  const speech = whisper.segments
    .filter((s) => isSpeech(s, whisper.duration))
    .map((s) => (whisper.duration > 0 ? { ...s, end: Math.min(s.end, whisper.duration) } : s));
  // On silence Whisper can still return a confident "Thank you.", so judge by the whole call:
  // a real phone conversation has more than a handful of words.
  if (countWords(speech) < MIN_WORDS) {
    throw new Error("No conversation was found in this recording. Check it's a phone call with people talking.");
  }

  const segments = await labelSpeakers(speech);

  const durationSec = whisper.duration || speech.at(-1)!.end;
  return { durationSec, segments: mergeTurns(segments) };
}
