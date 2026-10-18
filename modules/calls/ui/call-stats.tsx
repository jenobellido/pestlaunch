import { CircleCheck, Clock, Flag, Phone } from "lucide-react";
import type { CallRecord } from "../model/types";
import { callGroup } from "./call-status";

function formatTalkTime(totalSec: number) {
  const minutes = Math.round(totalSec / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Four headline numbers above the list: volume, win rate, open follow-ups, talk time. */
export function CallStats({ calls }: { calls: CallRecord[] }) {
  const groups = calls.map(callGroup);
  const analyzed = groups.filter((g) => g === "won" || g === "follow_up" || g === "lost").length;
  const won = groups.filter((g) => g === "won").length;
  const followUps = groups.filter((g) => g === "follow_up").length;
  const talkTime = calls.reduce((sum, c) => sum + (c.durationSec ?? 0), 0);

  const stats = [
    { label: "Calls", value: String(calls.length), hint: `${analyzed} analyzed`, icon: Phone },
    {
      label: "Successful",
      value: analyzed > 0 ? `${Math.round((won / analyzed) * 100)}%` : "–",
      hint: "Booked, saved or resolved",
      icon: CircleCheck,
    },
    { label: "Need follow-up", value: String(followUps), hint: "Unresolved or waiting on us", icon: Flag },
    { label: "Talk time", value: formatTalkTime(talkTime), hint: "Across all calls", icon: Clock },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] bg-line lg:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon }) => (
        <div key={label} className="flex min-w-0 flex-col gap-2 bg-card px-5 py-4">
          <dt className="flex items-center gap-2 text-sm text-muted">
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </dt>
          <dd className="min-w-0">
            <span className="block text-2xl font-medium tabular-nums">{value}</span>
            <span className="mt-0.5 hidden truncate text-xs text-muted sm:block">{hint}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
