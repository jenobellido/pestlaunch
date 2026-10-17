import Link from "next/link";
import { CALL_TYPE_LABELS } from "../config/call-types";
import type { CallRecord } from "../model/types";

export function CallList({ tenantSlug, calls }: { tenantSlug: string; calls: CallRecord[] }) {
  if (calls.length === 0) return <p className="text-zinc-500">No calls processed yet.</p>;
  return (
    <ul className="divide-y divide-black/10 dark:divide-white/10">
      {calls.map((c) => (
        <li key={c.id}>
          <Link href={`/${tenantSlug}/calls/${c.id}`} className="flex justify-between py-3">
            <span>
              <span className="font-medium">{c.fileName}</span>
              <span className="ml-2 text-sm text-zinc-500">
                {c.callType ? CALL_TYPE_LABELS[c.callType] : c.status}
              </span>
            </span>
            <span className="text-sm text-zinc-500">{c.employeeName ?? "—"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
