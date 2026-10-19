"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { AlertTriangle, AudioLines, ChevronRight, Phone, Search, SearchX, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge, EmptyState } from "@/shared/ui/card";
import { CALL_TYPE_GROUP_LABELS, type CallTypeGroup } from "../config/call-types";
import type { CallRecord, CallResolution } from "../model/types";
import { CallResultBadge, type CallGroup } from "./call-status";

/** A call as the list shows it. Prepared on the server, so it's plain data plus the score node. */
export interface CallListItem {
  id: string;
  href: string;
  status: CallRecord["status"];
  outcome?: { resolution: CallResolution };
  title: string;
  subtitle: string;
  type: string | null;
  employee: string | null;
  duration: string | null;
  date: string;
  group: CallGroup;
  /** PestLaunch's call type group (Sales, Service, ...), null until analyzed. */
  typeGroup: CallTypeGroup | null;
  /** Groups calls by rep for the Rep filter: the member id, or "unassigned". */
  repKey: string | null;
  /** Upload time in ms, for the date filter. */
  createdAtMs: number;
  /** Lower-case text the search box matches against. */
  search: string;
  /** A person has checked this call's results. */
  reviewed: boolean;
  /** The AI's results look uncertain and a person should check them. */
  needsReview: boolean;
  score?: React.ReactNode;
}

const FILTERS: { id: "all" | CallGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "won", label: "Successful" },
  { id: "follow_up", label: "Follow-up" },
  { id: "lost", label: "Lost" },
  { id: "processing", label: "Processing" },
  { id: "failed", label: "Failed" },
];

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function CallIcon({ status }: { status: CallRecord["status"] }) {
  if (status === "failed")
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
        <AlertTriangle className="size-[18px]" aria-hidden />
      </span>
    );
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        status === "processing" ? "bg-sky/15 text-sky" : "bg-accent/15 text-accent",
      )}
    >
      <AudioLines className={cn("size-[18px]", status === "processing" && "animate-pulse")} aria-hidden />
    </span>
  );
}

const DATE_FILTERS = [
  { id: "all", label: "Any time", days: null },
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
] as const;

const filterSelect =
  "h-9 rounded-full border border-line bg-card px-3 text-sm outline-none transition-colors hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15";

export function CallList({ items, showScore }: { items: CallListItem[]; showScore: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "review" | CallGroup>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CallTypeGroup>("all");
  const [repFilter, setRepFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]["id"]>("all");
  // Captured once per mount so "Today" doesn't drift during render.
  const [now] = useState(() => Date.now());
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  if (items.length === 0)
    return (
      <EmptyState icon={Phone} title="No calls yet">
        Upload a call recording above. It&apos;s transcribed, classified, scored and coached in about a minute.
      </EmptyState>
    );

  const counts: Record<string, number> = Object.fromEntries(FILTERS.map((f) => [f.id, f.id === "all" ? items.length : 0]));
  for (const item of items) counts[item.group]++;
  counts.review = items.filter((i) => i.needsReview).length;
  const filters: { id: "all" | "review" | CallGroup; label: string }[] = [
    ...FILTERS.filter((f) => f.id === "all" || counts[f.id] > 0),
    ...(counts.review > 0 ? [{ id: "review" as const, label: "Needs review" }] : []),
  ];

  const typeCounts = new Map<CallTypeGroup, number>();
  for (const item of items) if (item.typeGroup) typeCounts.set(item.typeGroup, (typeCounts.get(item.typeGroup) ?? 0) + 1);
  const reps = [...new Map(items.filter((i) => i.repKey).map((i) => [i.repKey!, i.employee ?? "Unassigned"]))].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const days = DATE_FILTERS.find((d) => d.id === dateFilter)?.days;
  const since = days ? now - days * 24 * 60 * 60 * 1000 : 0;

  const visible = items.filter(
    (item) =>
      (filter === "all" || (filter === "review" ? item.needsReview : item.group === filter)) &&
      (typeFilter === "all" || item.typeGroup === typeFilter) &&
      (repFilter === "all" || item.repKey === repFilter) &&
      item.createdAtMs >= since &&
      (!deferredQuery || item.search.includes(deferredQuery)),
  );
  const columns = showScore
    ? "lg:grid-cols-[minmax(0,1fr)_150px_96px_150px_110px_16px]"
    : "lg:grid-cols-[minmax(0,1fr)_150px_150px_110px_16px]";

  return (
    <section aria-label="Call library" className="overflow-hidden rounded-[28px] bg-card">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div role="group" aria-label="Filter by result" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none",
                filter === f.id ? "bg-accent font-medium text-accent-ink" : "bg-chip text-fg/80 hover:bg-card-2",
              )}
            >
              {f.label}
              <span className={cn("tabular-nums", filter === f.id ? "opacity-70" : "text-muted")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="call-log-type">
            Call type
          </label>
          <select
            id="call-log-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | CallTypeGroup)}
            className={filterSelect}
          >
            <option value="all">All types</option>
            {(Object.keys(CALL_TYPE_GROUP_LABELS) as CallTypeGroup[])
              .filter((g) => typeCounts.has(g))
              .map((g) => (
                <option key={g} value={g}>
                  {CALL_TYPE_GROUP_LABELS[g]} ({typeCounts.get(g)})
                </option>
              ))}
          </select>
          {reps.length > 1 && (
            <>
              <label className="sr-only" htmlFor="call-log-rep">
                Rep
              </label>
              <select id="call-log-rep" value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className={filterSelect}>
                <option value="all">All reps</option>
                {reps.map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label className="sr-only" htmlFor="call-log-date">
            Date
          </label>
          <select
            id="call-log-date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as (typeof DATE_FILTERS)[number]["id"])}
            className={filterSelect}
          >
            {DATE_FILTERS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        <label className="relative block sm:w-56">
          <span className="sr-only">Search calls</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calls"
            className="h-10 w-full rounded-full border border-line bg-card pr-9 pl-10 text-sm outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <SearchX className="size-6 text-muted" aria-hidden />
          <p className="mt-3 font-medium">No calls match</p>
          <p className="mt-1 text-sm text-muted">Try another search or filter.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
              setTypeFilter("all");
              setRepFilter("all");
              setDateFilter("all");
            }}
            className="press mt-4 h-9 rounded-full border border-line px-4 text-sm hover:bg-card-2"
          >
            Show all calls
          </button>
        </div>
      ) : (
        <>
          <div className={cn("hidden gap-4 border-b border-line px-6 py-3 text-xs text-muted lg:grid", columns)}>
            <span>Call</span>
            <span>Rep</span>
            {showScore && <span>Score</span>}
            <span>Outcome</span>
            <span>Uploaded</span>
            <span />
          </div>
          <ul>
            {visible.map((item) => (
              <li key={item.id} className="border-b border-line last:border-b-0">
                <Link
                  href={item.href}
                  className={cn(
                    "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-card-2 focus-visible:bg-card-2 focus-visible:outline-none sm:px-6",
                    columns,
                  )}
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <CallIcon status={item.status} />
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{item.title}</span>
                        {item.type && <Badge className="hidden shrink-0 sm:inline-flex">{item.type}</Badge>}
                        {item.needsReview && (
                          <Badge dot="bg-orange" className="shrink-0">
                            Needs review
                          </Badge>
                        )}
                        {item.reviewed && (
                          <Badge dot="bg-success" className="hidden shrink-0 sm:inline-flex">
                            Reviewed
                          </Badge>
                        )}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 line-clamp-1 text-sm",
                          item.status === "failed" ? "text-danger" : "text-muted",
                        )}
                      >
                        {item.subtitle}
                      </span>
                      {/* Below lg the columns fold into one meta line. */}
                      <span className="mt-1 block text-xs text-muted lg:hidden">
                        {item.type && <span className="sm:hidden">{item.type} · </span>}
                        {[item.employee, item.duration, item.date].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </span>

                  <span className="hidden min-w-0 items-center gap-2.5 lg:flex">
                    {item.employee ? (
                      <>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chip text-[11px] font-medium">
                          {initialsOf(item.employee)}
                        </span>
                        <span className="truncate text-sm">{item.employee}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted">Unassigned</span>
                    )}
                  </span>
                  {showScore && <span className="hidden lg:block">{item.score ?? <span className="text-sm text-muted">–</span>}</span>}
                  <span className="self-start justify-self-end lg:self-center lg:justify-self-start">
                    <CallResultBadge call={item} />
                  </span>
                  <span className="hidden text-sm text-muted tabular-nums lg:block">
                    <span className="block">{item.date}</span>
                    {item.duration && <span className="block text-xs">{item.duration} talk</span>}
                  </span>
                  <ChevronRight
                    className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg lg:block"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
