import "server-only";
import { z } from "zod";
import { serverEnv } from "@/core/config/env";

// Thin client for any OpenAI-compatible API: Groq by default, or OpenAI by setting AI_BASE_URL
// and the model names (see .env.example). Plain fetch keeps it dependency-free. Neither Groq
// nor OpenAI trains on API data by default, which the test brief requires for the recordings.

const BASE_URL = serverEnv.AI_BASE_URL.replace(/\/+$/, "");

/**
 * Reasoning models (gpt-oss, OpenAI's gpt-5 and o-series) take a reasoning effort; OpenAI's own
 * reasoning models also reject a custom temperature. Other models get temperature 0 and no effort.
 */
function samplingFor(model: string, reasoningEffort: "low" | "medium" | "high") {
  const name = model.toLowerCase().split("/").pop() ?? "";
  const openAiReasoning = /^(gpt-5|o\d)/.test(name);
  const reasoning = openAiReasoning || name.startsWith("gpt-oss");
  return {
    ...(openAiReasoning ? {} : { temperature: 0 }),
    ...(reasoning ? { reasoning_effort: reasoningEffort } : {}),
  };
}
// The free tier allows 8,000 chat tokens a minute, so rate limits are waited out patiently.
const MAX_ATTEMPTS = 6;
const MAX_WAIT_MS = 60_000;

export class AiError extends Error {
  constructor(
    message: string,
    /** HTTP status from the API, when the error came from a response. */
    readonly status?: number,
    /** Set when a usage limit was reached: how long until the model can be used again. */
    readonly retryAfterMs?: number,
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
        waitMs,
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
  const models = chatModels();
  for (const [i, model] of models.entries()) {
    try {
      return await generateWithRetries(options, model);
    } catch (err) {
      // Usage limit on this model (e.g. the free daily tokens): remember it, use the next one.
      const limited = err instanceof AiError && err.retryAfterMs !== undefined;
      if (!limited || i === models.length - 1) throw err;
      limitedUntil.set(model, Date.now() + err.retryAfterMs!);
      console.warn(`[ai] ${model} hit its usage limit; using ${models[i + 1]} instead`);
    }
  }
  throw new AiError("No AI model is available right now.");
}

/**
 * Models that have hit a usage limit, until when. Kept per server process, so later calls
 * go straight to the fallback instead of waiting on another rejection first.
 */
const globalForAi = globalThis as unknown as { aiLimitedUntil?: Map<string, number> };
const limitedUntil = (globalForAi.aiLimitedUntil ??= new Map<string, number>());

/** The main chat model, then the fallback. A model still inside a known limit goes last. */
function chatModels() {
  const all = [serverEnv.AI_CHAT_MODEL, serverEnv.AI_CHAT_FALLBACK_MODEL].filter(
    (m, i, list) => m.trim() !== "" && list.indexOf(m) === i,
  );
  const available = (m: string) => (limitedUntil.get(m) ?? 0) <= Date.now();
  return [...all.filter(available), ...all.filter((m) => !available(m))];
}

async function generateWithRetries<T>(options: GenerateObjectOptions<T>, model: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await generateObjectOnce(options, model);
    } catch (err) {
      // Our own shape check (no status), or Groq rejecting output that broke the schema.
      const invalidOutput =
        err instanceof AiError && (err.status === undefined || (err.status === 400 && /validate JSON|match the expected schema|failed_generation/i.test(err.message)));
      if (!invalidOutput || attempt === 4) throw err;
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
  /**
   * Checks the answer beyond its shape, e.g. that every item was graded. Return a problem to
   * have the request retried like any other invalid output, or null when it's complete.
   */
  check?: (data: T) => string | null;
}

/** The JSON schema for strict structured output, without the "$schema" key some APIs reject. */
function strictSchema(schema: z.ZodType) {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  return rest;
}

async function generateObjectOnce<T>(
  { name, schema, system, prompt, reasoningEffort = "medium", check }: GenerateObjectOptions<T>,
  model: string,
): Promise<T> {
  const res = await request("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      ...samplingFor(model, reasoningEffort),
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name, strict: true, schema: strictSchema(schema) },
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
  const problem = check?.(parsed.data);
  if (problem) throw new AiError(`The AI answer was incomplete: ${problem}`);
  return parsed.data;
}
