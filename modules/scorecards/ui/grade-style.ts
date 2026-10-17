import type { Grade } from "../model/types";

/** Label and colours for each grade, shared by the panel and the list badge. */
export const GRADE: Record<Grade, { label: string; badge: string; bar: string; dot: string }> = {
  gold: { label: "Gold Standard", badge: "bg-orange text-on-orange", bar: "bg-orange", dot: "bg-orange" },
  green: { label: "Green Standard", badge: "bg-badge-success text-on-badge-success", bar: "bg-accent", dot: "bg-accent" },
  below: { label: "Below Standard", badge: "bg-badge-danger text-on-badge-danger", bar: "bg-danger", dot: "bg-danger" },
};
