/** Private bucket created by drizzle/0001_storage_buckets.sql. */
export const RECORDINGS_BUCKET = "recordings";

/** Matches the storage file size limit in supabase/config.toml. */
export const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

/** Audio formats the transcription step accepts, by file extension. */
export const RECORDING_EXTENSIONS = [".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm", ".flac"] as const;
