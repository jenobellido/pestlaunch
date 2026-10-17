import { createUploadHandler } from "@/modules/calls/server";
import { withModule } from "../../_lib/with-module";

// Step 1 of an upload: returns a private storage path and a one-time token the
// browser uploads the recording with. Then POST /calls processes it.
export const POST = withModule("calls", createUploadHandler);
