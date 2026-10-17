import { createClient } from "@supabase/supabase-js";
import { RECORDINGS_BUCKET } from "./config";

/**
 * Browser side of an upload: sends the file straight to storage with the token from
 * `createRecordingUpload`, so large recordings never pass through our API (serverless
 * hosts cap request bodies at a few MB). The token only allows writing that one path.
 */
export async function uploadRecordingWithToken(path: string, token: string, file: File) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}
