import "server-only";
import { z } from "zod";
import { serverEnv } from "@/core/config/env";

// Thin client for Groq's OpenAI-compatible API. Plain fetch keeps it dependency-free.
// Groq doesn't train on API data, which the test brief requires for the call recordings.

const BASE_URL = "https://api.groq.com/openai/v1";
// The free tier allows 8,000 chat tokens a minute, so rate limits are waited out patiently.
const MAX_ATTEMPTS = 6;
const MAX_WAIT_MS = 60_000;

export class AiError extends Error {
  constructor(
    message: string,
    /** HTTP status from the API, when the error came from a response. */
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Retries rate limits and server errors with backoff, honouring Retry-After. */
async function request(path: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${serverEnv.AI_API_KEY}`, ...init.headers },
    });
    if (res.ok) return res;

    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
    // A wait longer than we're willing to sit through (e.g. a daily token limit) fails now,
    // with a message the user can act on, instead of retrying until the job is cut off.
    if (res.status === 429 && waitMs > MAX_WAIT_MS) {
      const minutes = Math.ceil(waitMs / 60_000);
      throw new AiError(
        `The AI service's usage limit has been reached. It resets in about ${minutes} minute${minutes === 1 ? "" : "s"}; retry the call then.`,
        429,
      );
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      const body = await res.text().catch(() => "");
      const message = (() => {
        try {
          return JSON.parse(body).error?.message as string | undefined;
        } catch {
          return undefined;
        }
      })();
      throw new AiError(`AI request failed (${res.status}): ${message ?? (body.slice(0, 200) || res.statusText)}`, res.status);
    }
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  /** Average log probability; very low values usually mean noise or a hallucination. */
  avg_logprob?: number;
  no_speech_prob?: number;
}

export interface WhisperResult {
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

/** Speech to text with segment timestamps. `prompt` biases spelling of names and jargon. */
export async function transcribeAudio(audio: File, options: { prompt?: string } = {}): Promise<WhisperResult> {
  const form = new FormData();
  form.append("file", audio);
  form.append("model", serverEnv.AI_TRANSCRIPTION_MODEL);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("language", "en");
  form.append("temperature", "0");
  if (options.prompt) form.append("prompt", options.prompt);

  const res = await request("/audio/transcriptions", { method: "POST", body: form });
  const json = (await res.json()) as Partial<WhisperResult>;
  return { duration: json.duration ?? 0, text: json.text ?? "", segments: json.segments ?? [] };
}

/**
 * Chat completion that must return JSON matching `schema` (strict structured output),
 * validated again with zod so callers get typed, trusted data or an error. The model
 * occasionally produces output that fails validation, so that is retried.
 */
export async function generateObject<T>(options: GenerateObjectOptions<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await generateObjectOnce(options);
    } catch (err) {
      // Our own shape check (no status), or Groq rejecting output that broke the schema.
      const invalidOutput =
        err instanceof AiError && (err.status === undefined || (err.status === 400 && /validate JSON/i.test(err.message)));
      if (!invalidOutput || attempt === 3) throw err;
    }
  }
}

interface GenerateObjectOptions<T> {
  name: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  /** How much the model thinks first. Thinking tokens count against rate limits; use "low" for simple tasks. */
  reasoningEffort?: "low" | "medium" | "high";
}

async function generateObjectOnce<T>({
  name,
  schema,
  system,
  prompt,
  reasoningEffort = "medium",
}: GenerateObjectOptions<T>): Promise<T> {
  const res = await request("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: serverEnv.AI_CHAT_MODEL,
      temperature: 0,
      reasoning_effort: reasoningEffort,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name, strict: true, schema: z.toJSONSchema(schema, { target: "draft-7" }) },
      },
    }),
  });
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new AiError("The AI returned no answer.");

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new AiError("The AI answer wasn't valid JSON.");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AiError(`The AI answer didn't match the expected shape: ${parsed.error.message}`);
  return parsed.data;
}
