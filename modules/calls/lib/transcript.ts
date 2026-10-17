import type { WhisperSegment } from "@/core/ai";
import type { Speaker, TranscriptSegment } from "@/core/calls";

// The pure rules behind transcription (server/transcribe.ts), kept apart from the AI calls
// so they can be unit tested.

/** Fewer words than this means the recording has no real conversation in it. */
export const MIN_WORDS = 5;

/**
 * Whisper invents text for silence and hold music (often "Thank you."). It marks those
 * segments with a high no-speech probability: real speech in the test calls stays under
 * 0.25, a silent file scores 0.7. It can also place segments past the end of the audio.
 */
export function isSpeech(s: WhisperSegment, duration: number) {
  if (!s.text.trim()) return false;
  if (duration > 0 && s.start >= duration) return false;
  return (s.no_speech_prob ?? 0) <= 0.5;
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
