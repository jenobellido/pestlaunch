import type { WhisperSegment } from "@/core/ai";
import type { Speaker, TranscriptSegment } from "@/core/calls";

// The pure rules behind transcription (server/transcribe.ts), kept apart from the AI calls
// so they can be unit tested.

/** Fewer words than this means the recording has no real conversation in it. */
export const MIN_WORDS = 5;

/**
 * Whisper invents text for silence and hold music (often "Thank you."). Following Whisper's
 * own rule, a segment is dropped only when it's probably silence *and* the text is a low-
 * confidence guess. The no-speech probability alone isn't enough: OpenAI's whisper-1 shares
 * it across a 30-second window, and real speech there often scores 0.5 to 0.6. It can also
 * place segments past the end of the audio.
 */
export function isSpeech(s: WhisperSegment, duration: number) {
  if (!s.text.trim()) return false;
  if (duration > 0 && s.start >= duration) return false;
  const silent = (s.no_speech_prob ?? 0) > 0.6 && (s.avg_logprob ?? 0) < -1;
  // Whisper's own loop check: very repetitive text is a decoding loop, not speech.
  const looping = (s.compression_ratio ?? 0) > 2.4;
  return !silent && !looping;
}

/** A long line repeated within this many lines is a Whisper loop, not someone saying it again. */
const REPEAT_WINDOW = 4;
/** Short replies ("Okay.", "Yes, ma'am.") really do repeat, so only longer lines count. */
const REPEAT_MIN_WORDS = 5;

/**
 * Drops lines that repeat one of the few lines just before them word for word. Whisper can
 * get stuck and emit the same sentence many times over a stretch of audio.
 */
export function dropRepeats<T extends { text: string }>(segments: readonly T[]): T[] {
  const kept: T[] = [];
  for (const s of segments) {
    const text = words(s.text);
    const long = text.split(" ").length >= REPEAT_MIN_WORDS;
    if (long && kept.slice(-REPEAT_WINDOW).some((k) => words(k.text) === text)) continue;
    kept.push(s);
  }
  return kept;
}

/** Words that mean card details are about to be read out. */
const PAYMENT_CUE = /\b(card|credit|debit|expir\w*|security code|cvv|cvc|visa|mastercard|amex|american express|discover)\b/i;
/** How long after the last cue or masked number digits are still treated as card details. */
const PAYMENT_WINDOW_SEC = 60;
/** Any run of digits, possibly in groups ("4111 1111", "08/27", "1-2-3"). */
const DIGITS = /\d(?:[\d\s\-\/.]*\d)?/g;
/** Kept even inside the window: prices and phone numbers aren't card details. */
const PHONE = /^\d{3}[\s\-.]\d{3}[\s\-.]\d{4}$/;
export const REDACTED = "[redacted]";

/** A line that is little more than a group of digits, like "Yep. 4111." during a read-back. */
function isDigitGroupLine(text: string) {
  const digits = text.replace(/\D/g, "").length;
  const otherWords = text.replace(DIGITS, " ").split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  return digits >= 3 && otherWords <= 3;
}

/**
 * Masks payment card details before the transcript is stored or sent to a language model.
 * Customers read card numbers out four digits at a time over several lines (often after a
 * pause to find the card), then the expiry and security code, so a long-number check alone
 * misses them. Digits are masked, except prices, percentages and phone numbers, when they're:
 * - within a minute either side of a line mentioning a card, its expiry, code or brand;
 * - part of a read-back: neighbouring lines, within 20 seconds, each little more than a digit group;
 * - a run of 13 to 19 digits, anywhere.
 */
export function redactPaymentDetails<T extends { start: number; end: number; text: string }>(
  segments: readonly T[],
): { segments: T[]; redacted: number } {
  const cues = segments.filter((s) => PAYMENT_CUE.test(s.text));
  const nearCue = (s: T) => cues.some((c) => s.start >= c.start - PAYMENT_WINDOW_SEC && s.start <= c.end + PAYMENT_WINDOW_SEC);
  const groupLine = segments.map((s) => isDigitGroupLine(s.text));
  // Read-back lines follow each other closely; a digit line minutes later is something else.
  const close = (i: number, j: number) => groupLine[j] === true && Math.abs(segments[i].start - segments[j].start) <= 20;
  const readBack = (i: number) => groupLine[i] && (close(i, i - 1) || close(i, i + 1));

  // A masked line keeps the window open, so a long read-out stays covered to its end.
  let chainUntil = -Infinity;
  let redacted = 0;
  const out = segments.map((s, i) => {
    const inWindow = nearCue(s) || readBack(i) || s.start <= chainUntil;
    let masked = false;
    const text = s.text.replace(DIGITS, (run, at: number) => {
      const digits = run.replace(/\D/g, "").length;
      const price = (at > 0 && s.text[at - 1] === "$") || s.text[at + run.length] === "%";
      const cardLength = digits >= 13 && digits <= 19;
      if (!cardLength && (!inWindow || price || PHONE.test(run.trim()) || digits < 2)) return run;
      masked = true;
      return REDACTED;
    });
    if (!masked) return s;
    redacted++;
    chainUntil = Math.max(chainUntil, s.end + PAYMENT_WINDOW_SEC);
    return { ...s, text };
  });
  return { segments: out, redacted };
}

/** Words across all segments. On silence Whisper can still return a confident "Thank you.". */
export function countWords(segments: readonly { text: string }[]) {
  return segments.reduce((n, s) => n + (s.text.trim() ? s.text.trim().split(/\s+/).length : 0), 0);
}

/** Words only, lower case, so text compares equal despite punctuation and casing. */
export const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();

export type SplitPiece = { speaker: Speaker; text: string };

/**
 * Whether the model's split of a line is exactly that line's words, in order. A split is
 * only accepted when it is, so labelling never adds, drops or changes words.
 */
export function isExactSplit(pieces: readonly SplitPiece[], original: string) {
  return pieces.length >= 2 && words(pieces.map((p) => p.text).join(" ")) === words(original);
}

/**
 * Turns one Whisper segment into one transcript line per piece. Whisper has no timestamps
 * inside a segment, so its time is shared out by text length.
 */
export function splitSegment(s: Pick<WhisperSegment, "start" | "end">, pieces: readonly SplitPiece[]): TranscriptSegment[] {
  const total = pieces.reduce((n, p) => n + p.text.length, 0) || 1;
  let at = s.start;
  return pieces.map((p) => {
    const end = at + ((s.end - s.start) * p.text.length) / total;
    const piece = { speaker: p.speaker, start: at, end, text: p.text.trim() };
    at = end;
    return piece;
  });
}

/** Joins consecutive lines from the same speaker into one turn, up to ~30s so timestamps stay useful. */
export function mergeTurns(segments: readonly TranscriptSegment[]): TranscriptSegment[] {
  const turns: TranscriptSegment[] = [];
  for (const s of segments) {
    const last = turns.at(-1);
    if (last && last.speaker === s.speaker && s.start - last.end < 2 && s.end - last.start <= 30) {
      last.end = s.end;
      last.text = `${last.text} ${s.text}`;
    } else {
      turns.push({ ...s });
    }
  }
  return turns;
}
