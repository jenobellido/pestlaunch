"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CornerDownLeft, FileAudio, Search, SquareKanban, UserRound } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Spinner } from "@/shared/ui/button";
import { searchWorkspace, type SearchResults } from "../_lib/search-actions";

export interface CommandPage {
  label: string;
  href: string;
  /** Rendered on the server; components can't cross to the client. */
  icon: React.ReactNode;
  /** Extra words people might type for this page, e.g. "grading rubric". */
  keywords?: string;
  /** Listed only once something is typed, to keep the opening list short. */
  searchOnly?: boolean;
}

interface Item {
  id: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  meta?: string;
}

const OPEN_EVENT = "pestlaunch:open-search";

/** Opens the quick search from anywhere, e.g. a button in the sidebar. */
export function openCommandMenu() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const noSubscribe = () => () => {};

/** "⌘K" on Apple devices, "Ctrl K" elsewhere. The server can't know, so it says "⌘K". */
function useShortcutLabel() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );
}

/** The sidebar's search field look-alike; clicking it (or ⌘K) opens the menu. */
export function SearchButton({ compact }: { compact?: boolean }) {
  const shortcut = useShortcutLabel();
  if (compact) {
    return (
      <button
        type="button"
        onClick={openCommandMenu}
        aria-label="Search"
        className="press flex size-10 items-center justify-center rounded-full text-muted hover:text-fg"
      >
        <Search className="size-[18px]" aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openCommandMenu}
      aria-keyshortcuts="Meta+K Control+K"
      className="press flex h-11 w-full items-center gap-3 rounded-full bg-card pr-2 pl-[13px] text-sm text-muted transition-colors hover:text-fg"
    >
      <Search className="size-[18px] shrink-0" aria-hidden />
      <span className="flex-1 text-left">Search</span>
      <kbd className="rounded-full bg-chip px-2 py-0.5 font-sans text-[11px] text-muted">{shortcut}</kbd>
    </button>
  );
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Quick search (⌘K, Ctrl K or "/"): jump to a page, call, lead or rep. Rendered once per
 * workspace; buttons open it with openCommandMenu().
 */
export function CommandMenu({ slug, pages }: { slug: string; pages: CommandPage[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Results remember which query they answer, so "still searching" is just a mismatch.
  const [answer, setAnswer] = useState<{ query: string; results: SearchResults | null } | null>(null);
  const results = answer?.results ?? null;
  const loading = open && answer?.query !== query;
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const listId = useId();

  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // ⌘K / Ctrl K toggles from anywhere; "/" opens when you're not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else show();
      } else if (e.key === "/" && !open) {
        const el = e.target as HTMLElement;
        if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, [open, show, close]);

  useEffect(() => {
    if (!open) return;
    // Focus goes back where it was when the menu closes.
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  // Search as you type, a beat after the last key. Late answers to older queries are dropped.
  useEffect(() => {
    if (!open) return;
    const id = ++requestId.current;
    const timer = setTimeout(
      async () => {
        const found = await searchWorkspace(slug, query).catch(() => null);
        if (id !== requestId.current) return;
        setAnswer({ query, results: found });
        setActive(0);
      },
      query ? 150 : 0,
    );
    return () => clearTimeout(timer);
  }, [open, query, slug]);

  const groups = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const pageItems: Item[] = pages
      .filter((p) => (terms.length === 0 ? !p.searchOnly : terms.every((t) => `${p.label} ${p.keywords ?? ""}`.toLowerCase().includes(t))))
      .map((p) => ({ id: `page:${p.label}`, href: p.href, icon: p.icon, title: p.label }));
    const calls: Item[] = (results?.calls ?? []).map((c) => ({
      id: `call:${c.id}`,
      href: `/${slug}/calls/${c.id}`,
      icon: <FileAudio aria-hidden />,
      title: c.title,
      detail: c.snippet,
      meta: [c.meta, when(c.createdAt)].filter(Boolean).join(" · "),
    }));
    const leads: Item[] = (results?.leads ?? []).map((l) => ({
      id: `lead:${l.id}`,
      href: `/${slug}/calls/${l.callId}`,
      icon: <SquareKanban aria-hidden />,
      title: l.name,
      meta: l.meta,
    }));
    const reps: Item[] = (results?.reps ?? []).map((r) => ({
      id: `rep:${r.id}`,
      href: `/${slug}/team/${r.id}`,
      icon: <UserRound aria-hidden />,
      title: r.name,
      meta: r.role,
    }));
    return [
      { label: query ? "Pages" : "Go to", items: pageItems },
      { label: query ? "Calls" : "Recent calls", items: calls },
      { label: "Leads", items: leads },
      { label: "Reps", items: reps },
    ].filter((g) => g.items.length > 0);
  }, [pages, results, query, slug]);

  const flat = groups.flatMap((g) => g.items);
  const current = flat[Math.min(active, flat.length - 1)];

  useEffect(() => {
    if (!current) return;
    listRef.current?.querySelector(`[data-id="${CSS.escape(current.id)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const go = (item: Item) => {
    close();
    router.push(item.href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (Math.min(i, flat.length - 1) + step + flat.length) % flat.length);
    } else if (e.key === "Enter" && current) {
      e.preventDefault();
      go(current);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-card shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          {loading ? (
            <Spinner className="size-[18px] shrink-0 text-muted" />
          ) : (
            <Search className="size-[18px] shrink-0 text-muted" aria-hidden />
          )}
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search calls, customers, reps, or what was said"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-full bg-chip px-2 py-0.5 font-sans text-[11px] text-muted sm:block">esc</kbd>
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              {loading ? "Searching…" : <>Nothing matches &ldquo;{query}&rdquo;. Try a customer, a rep or a word from the call.</>}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} role="group" aria-label={group.label} className="pb-1">
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{group.label}</p>
                {group.items.map((item) => {
                  const selected = item === current;
                  return (
                    <div
                      key={item.id}
                      id={`${listId}-${item.id}`}
                      data-id={item.id}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setActive(flat.indexOf(item))}
                      onClick={() => go(item)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5",
                        selected ? "bg-card-2" : "",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4",
                          selected ? "bg-accent text-accent-ink" : "bg-chip text-muted",
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-medium">{item.title}</span>
                          {item.meta && <span className="shrink-0 truncate text-xs text-muted">{item.meta}</span>}
                        </span>
                        {item.detail && <span className="block truncate text-xs text-muted">{item.detail}</span>}
                      </span>
                      {selected && <CornerDownLeft className="size-4 shrink-0 text-muted" aria-hidden />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-line px-5 py-2.5 text-xs text-muted sm:flex">
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}
