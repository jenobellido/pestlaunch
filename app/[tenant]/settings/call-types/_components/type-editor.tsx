"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { CALL_TYPE_GROUP_LABELS, CALL_TYPE_GROUPS, type CallTypeGroup } from "@/core/calls";
import { cn } from "@/shared/lib/cn";
import { primaryButton, secondaryButton, Spinner } from "@/shared/ui/button";
import { FormAlert, Switch } from "@/shared/ui/form";
import { deleteCallTypeAction, draftCallTypeAction, resetCallTypeAction, saveCallTypeAction } from "../actions";
import type { CallTypeInput } from "../_lib/input";

const field =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15";
const iconButton =
  "press flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg disabled:opacity-30";

type Section = CallTypeInput["sections"][number];

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** The setup assistant: a description in, a drafted type and scorecard out, for review. */
function AiDraft({ slug, onDraft }: { slug: string; onDraft: (draft: CallTypeInput) => void }) {
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = useId();
  return (
    <section className="rounded-[28px] border border-accent/30 bg-accent/5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-ink">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-[15px] font-medium">Set it up with AI</h2>
          <p className="text-sm text-muted">
            Describe the calls, or paste the part of your call manual about them. You&apos;ll review everything before it&apos;s saved.
          </p>
        </div>
      </div>
      <label htmlFor={id} className="sr-only">
        Describe the call type
      </label>
      <textarea
        id={id}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        placeholder="e.g. Businesses calling about a quote for monthly pest control at a restaurant or office. Reps should ask about the site, any health inspections coming up, and book a free site visit."
        className={cn(field, "mt-4 resize-y")}
      />
      {error && (
        <div className="mt-3">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <button
        type="button"
        disabled={pending || brief.trim().length < 15}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await draftCallTypeAction(slug, brief);
            if (result.ok) onDraft(result.draft);
            else setError(result.error);
          })
        }
        className={cn(primaryButton, "mt-3 disabled:cursor-not-allowed disabled:opacity-50")}
      >
        {pending ? <Spinner className="size-4" /> : <Sparkles className="size-4" aria-hidden />}
        {pending ? "Drafting…" : "Draft with AI"}
      </button>
    </section>
  );
}

/** Create or edit a call type and its scorecard. */
export function TypeEditor({
  slug,
  typeKey,
  initial,
  builtIn,
  customized,
  calls,
  showAssistant,
}: {
  slug: string;
  /** null when creating a new type. */
  typeKey: string | null;
  initial: CallTypeInput;
  builtIn: boolean;
  customized: boolean;
  /** How many calls have this type. */
  calls: number;
  showAssistant: boolean;
}) {
  const router = useRouter();
  const [input, setInput] = useState(initial);
  const [drafted, setDrafted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ids = useId();
  const set = <K extends keyof CallTypeInput>(key: K, value: CallTypeInput[K]) => setInput((i) => ({ ...i, [key]: value }));
  const setSections = (fn: (s: Section[]) => Section[]) => setInput((i) => ({ ...i, sections: fn(i.sections) }));
  const steps = input.sections.reduce((n, s) => n + s.items.length, 0);
  const isOther = typeKey === "other";

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, after: () => void) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (result.ok) after();
      else setError(result.error ?? "Something went wrong.");
    });
  const backToList = () => router.push(`/${slug}/settings/call-types`);

  return (
    <div className="space-y-4">
      {showAssistant && (
        <AiDraft
          slug={slug}
          onDraft={(draft) => {
            setInput(draft);
            setDrafted(true);
          }}
        />
      )}
      {drafted && (
        <FormAlert tone="info">Drafted by AI. Read it through and change anything before saving.</FormAlert>
      )}

      <section className="grid gap-4 rounded-[28px] bg-card p-5 sm:p-6">
        <h2 className="text-[15px] font-medium">About this call type</h2>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input value={input.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Commercial quote" className={cn(field, "h-10")} />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Dashboard group</span>
            <select value={input.group} onChange={(e) => set("group", e.target.value as CallTypeGroup)} className={cn(field, "h-10")}>
              {CALL_TYPE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {CALL_TYPE_GROUP_LABELS[g]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">How to recognise it</span>
          <span className="text-muted">The AI sorts calls by this, so say what the caller wants and what happens on the call.</span>
          <textarea value={input.description} onChange={(e) => set("description", e.target.value)} rows={3} className={cn(field, "resize-y")} />
        </label>
        {!isOther && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p id={`${ids}-on`} className="text-sm font-medium">
                On
              </p>
              <p className="text-sm text-muted">Off types aren&apos;t offered to the AI or on upload. Calls that have it keep it.</p>
            </div>
            <Switch checked={input.enabled} onChange={(v) => set("enabled", v)} aria-labelledby={`${ids}-on`} />
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-[28px] bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id={`${ids}-scored`} className="text-[15px] font-medium">
              Scorecard
            </h2>
            <p className="text-sm text-muted">
              {input.scored ? `${steps} step${steps === 1 ? "" : "s"}. Each call of this type is graded on every step.` : "These calls aren't graded."}
            </p>
          </div>
          <Switch checked={input.scored} onChange={(v) => set("scored", v)} aria-labelledby={`${ids}-scored`} />
        </div>

        {input.scored && (
          <>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Scorecard name</span>
              <input
                value={input.scorecardName}
                onChange={(e) => set("scorecardName", e.target.value)}
                placeholder={`${input.name || "These"} calls`}
                className={cn(field, "h-10")}
              />
            </label>

            {input.sections.map((section, si) => (
              <div key={si} className="rounded-2xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Section ${si + 1} title`}
                    value={section.title}
                    onChange={(e) => setSections((s) => s.map((x, i) => (i === si ? { ...x, title: e.target.value } : x)))}
                    placeholder="Section, e.g. Understand"
                    className={cn(field, "h-9 flex-1 font-medium")}
                  />
                  <button type="button" aria-label="Move section up" disabled={si === 0} onClick={() => setSections((s) => move(s, si, si - 1))} className={iconButton}>
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Move section down"
                    disabled={si === input.sections.length - 1}
                    onClick={() => setSections((s) => move(s, si, si + 1))}
                    className={iconButton}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <button type="button" aria-label={`Remove section ${section.title || si + 1}`} onClick={() => setSections((s) => s.filter((_, i) => i !== si))} className={iconButton}>
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={section.autoAward}
                    onChange={(e) => setSections((s) => s.map((x, i) => (i === si ? { ...x, autoAward: e.target.checked } : x)))}
                    className="accent-[var(--accent)]"
                  />
                  Objection handling: award these steps automatically when the caller raises no objections
                </label>
                <ol className="mt-3 grid gap-3">
                  {section.items.map((item, ii) => (
                    <li key={ii} className="grid gap-1.5 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-start">
                      <input
                        aria-label={`Step ${ii + 1} name`}
                        value={item.name}
                        onChange={(e) =>
                          setSections((s) =>
                            s.map((x, i) => (i === si ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, name: e.target.value } : y)) } : x)),
                          )
                        }
                        placeholder="Step, e.g. Investigate"
                        className={cn(field, "h-9")}
                      />
                      <textarea
                        aria-label={`What the rep must do for ${item.name || `step ${ii + 1}`}`}
                        value={item.criteria}
                        onChange={(e) =>
                          setSections((s) =>
                            s.map((x, i) => (i === si ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, criteria: e.target.value } : y)) } : x)),
                          )
                        }
                        rows={2}
                        placeholder="What the rep must say or do to pass"
                        className={cn(field, "resize-y")}
                      />
                      <button
                        type="button"
                        aria-label={`Remove step ${item.name || ii + 1}`}
                        onClick={() => setSections((s) => s.map((x, i) => (i === si ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)))}
                        className={cn(iconButton, "justify-self-end")}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setSections((s) => s.map((x, i) => (i === si ? { ...x, items: [...x.items, { name: "", criteria: "" }] } : x)))}
                  className="press mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-accent hover:bg-accent/10"
                >
                  <Plus className="size-4" aria-hidden />
                  Add step
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSections((s) => [...s, { title: "", autoAward: false, items: [{ name: "", criteria: "" }] }])}
              className={cn(secondaryButton, "h-10 justify-self-start")}
            >
              <Plus className="size-4" aria-hidden />
              Add section
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Gold from</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(steps, 1)}
                  value={input.gold}
                  onChange={(e) => set("gold", Number(e.target.value))}
                  className={cn(field, "h-10 tabular-nums")}
                />
                <span className="text-xs text-muted">points out of {steps}</span>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Green from</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(input.gold, 1)}
                  value={input.green}
                  onChange={(e) => set("green", Number(e.target.value))}
                  className={cn(field, "h-10 tabular-nums")}
                />
                <span className="text-xs text-muted">anything lower is Below Standard</span>
              </label>
            </div>
          </>
        )}
      </section>

      {error && <FormAlert>{error}</FormAlert>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveCallTypeAction(slug, typeKey, input), backToList)}
          className={primaryButton}
        >
          {pending && <Spinner className="size-4" />}
          {typeKey ? "Save changes" : "Create call type"}
        </button>
        <button type="button" onClick={backToList} className={secondaryButton}>
          Cancel
        </button>
        <span className="flex-1" />
        {builtIn && customized && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Put this call type back the way the manual has it? Your changes to it will be lost.")) {
                run(() => resetCallTypeAction(slug, typeKey!), backToList);
              }
            }}
            className={secondaryButton}
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset to default
          </button>
        )}
        {typeKey && !builtIn && (
          <button
            type="button"
            disabled={pending || calls > 0}
            title={calls > 0 ? "Calls use this type. Turn it off instead." : undefined}
            onClick={() => {
              if (confirm(`Delete ${input.name}? This can't be undone.`)) run(() => deleteCallTypeAction(slug, typeKey), backToList);
            }}
            className={cn(secondaryButton, "text-danger disabled:cursor-not-allowed disabled:opacity-50")}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        Changes apply to calls processed from now on. Calls already scored keep their score; correct a call&apos;s type in its review to re-score it.
      </p>
    </div>
  );
}
