// Server-only public API of the calls module.
export { applyCallReview, getCall, listCalls, searchTranscripts } from "./server/call-repository";
export { rescoreCall } from "./server/process-call";
export { getCallRecordingUrl } from "./server/playback";
export {
  assignCallHandler,
  callScope,
  createCallHandler,
  createUploadHandler,
  deleteCallHandler,
  getCallHandler,
  listCallsHandler,
  retryCallHandler,
  type Viewer,
} from "./server/handlers";
export {
  createTask,
  deleteTask,
  findTask,
  listTasks,
  setTaskAssignee,
  setTaskStatus,
  type CallTask,
} from "./server/task-repository";
export { toCsv } from "./lib/csv";
export { searchCalls } from "./server/search";
export type { CallSearchHit } from "./lib/search";
export { countExampleCalls, EXAMPLE_REP_NAMES, loadExampleCalls, removeExampleCalls } from "./server/example-calls";
