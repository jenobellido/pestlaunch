import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.url(),
  /** API key for the AI provider (OpenAI by default), used for transcription and call analysis. */
  AI_API_KEY: z.string().min(1),
  /** Any OpenAI-compatible API. OpenAI by default; e.g. https://api.groq.com/openai/v1 for Groq. */
  AI_BASE_URL: z.url().default("https://api.openai.com/v1"),
  /** Must return segment timestamps (verbose_json), so whisper-1 rather than gpt-4o-transcribe. */
  AI_TRANSCRIPTION_MODEL: z.string().min(1).default("whisper-1"),
  AI_CHAT_MODEL: z.string().min(1).default("gpt-5.5"),
  /** Used when the main chat model's usage limit is reached. Empty turns it off. */
  AI_CHAT_FALLBACK_MODEL: z.string().default("gpt-5.4-mini"),
});

/** Server-side environment, validated once at startup. */
export const serverEnv = schema.parse(process.env);
