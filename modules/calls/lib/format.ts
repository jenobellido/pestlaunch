/** Seconds as m:ss, e.g. 75 → "1:15". Used for call lengths and transcript timestamps. */
export function formatTimestamp(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}
