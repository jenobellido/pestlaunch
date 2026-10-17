// Public UI API of the calls module. Server code lives in "@/modules/calls/server".
export { callsModule } from "./module";
export { CallsPage } from "./ui/calls-page";
export { CallDetail } from "./ui/call-detail";
export { CALL_TYPE_LABELS } from "./config/call-types";
export type { CallOutcome, CallRecord, CallResolution, CallStatus } from "./model/types";
