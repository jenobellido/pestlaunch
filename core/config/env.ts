import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.url(),
  /** API key for the AI provider (Groq by default), used for transcription and call analysis. */
  AI_API_KEY: z.string().min(1),
  /** Any OpenAI-compatible API. Groq by default; https://api.openai.com/v1 for OpenAI. */
  AI_BASE_URL: z.url().default("https://api.groq.com/openai/v1"),
  AI_TRANSCRIPTION_MODEL: z.string().min(1).default("whisper-large-v3"),
  AI_CHAT_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
  /** Used when the main chat model's usage limit is reached (e.g. Groq's free daily tokens). Empty turns it off. */
  AI_CHAT_FALLBACK_MODEL: z.string().default("openai/gpt-oss-20b"),
});

/** Server-side environment, validated once at startup. */
export const serverEnv = schema.parse(process.env);
