export interface CoachingPoint {
  point: string;
  /** Transcript quote the feedback is based on. */
  quote: string | null;
  /** What the employee could say instead, ideally from the call manual scripts. */
  suggestion: string;
}

export interface CoachingFeedback {
  strengths: string[];
  improvements: CoachingPoint[];
  /** The one thing to focus on next call. */
  focus: string;
}
