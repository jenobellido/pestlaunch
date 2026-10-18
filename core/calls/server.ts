// Server-only API of the call domain: the company's call type catalog in the database.
export {
  countCallsByType,
  countCallsOfType,
  deleteCallType,
  getCallTypeMode,
  getCallTypes,
  resetCallType,
  saveCallType,
  setCallTypeEnabled,
  setCallTypeMode,
} from "./catalog-repository";
