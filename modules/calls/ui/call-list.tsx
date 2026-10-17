"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { AlertTriangle, AudioLines, ChevronRight, Phone, Search, SearchX, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge, EmptyState } from "@/shared/ui/card";
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
  /** Lower-case text the search box matches against. */
  search: string;
  score?: React.ReactNode;
}

const FILTERS: { id: "all" | CallGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "won", label: "Won" },
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

export function CallList({ items, showScore }: { items: CallListItem[]; showScore: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | CallGroup>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  if (items.length === 0)
    return (
      <EmptyState icon={Phone} title="No calls yet">
        Upload a call recording above. It&apos;s transcribed, classified, scored and coached in about a minute.
      </EmptyState>
    );

  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, f.id === "all" ? items.length : 0]));
  for (const item of items) counts[item.group]++;
  const filters = FILTERS.filter((f) => f.id === "all" || counts[f.id] > 0);

  const visible = items.filter(
    (item) =>
      (filter === "all" || item.group === filter) && (!deferredQuery || item.search.includes(deferredQuery)),
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
        <label className="relative block sm:w-64">
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
            <span>Employee</span>
            {showScore && <span>Score</span>}
            <span>Result</span>
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
                      <span className="text-sm text-muted">Unknown</span>
                    )}
                  </span>
                  {showScore && <span className="hidden lg:block">{item.score ?? <span className="text-sm text-muted">–</span>}</span>}
                  <span className="self-start justify-self-end lg:self-center lg:justify-self-start">
                    <CallResultBadge call={item} />
                  </span>
                  <span className="hidden text-sm text-muted tabular-nums lg:block">
                    <span className="block">{item.date}</span>
                    {item.duration && <span className="block text-xs">{item.duration} long</span>}
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
