// React starts a browser view transition for each animated update and chains
// `transition.finished.finally(...)`, but never handles a rejection, and never touches
// `updateCallbackDone`. The browser rejects both when it aborts a transition: the viewport is
// resized mid-way ("InvalidStateError"), the tab is in the background ("TimeoutError"), or a
// newer navigation interrupts it. Each abort then surfaces as an "Uncaught (in promise)" error
// and a Next.js dev issue, though nothing is wrong: the page simply skips the animation.
//
// guardViewTransitions wraps document.startViewTransition so those two promises always settle
// quietly. `ready` is left alone: React handles its rejection itself and cleans up from it.
//
// It also caps how long a transition may run. React holds the next navigation until the current
// transition finishes, so a transition that stalls (no frames painted: a throttled or hidden
// window, power saving) would freeze navigation. Ours last under 400ms; anything still running
// after MAX_TRANSITION_MS is skipped, which shows the new page at once.

type StartViewTransition = Document["startViewTransition"];

const GUARDED = Symbol.for("pestlaunch.viewTransitionGuard");

/** Longest a view transition may run before it's skipped. Our longest animation is 380ms. */
export const MAX_TRANSITION_MS = 1000;

export function guardViewTransitions(doc: Pick<Document, "startViewTransition">) {
  const start = doc.startViewTransition as (StartViewTransition & { [GUARDED]?: true }) | undefined;
  // Unsupported browsers have nothing to guard; a second call must not wrap twice.
  if (typeof start !== "function" || start[GUARDED]) return;

  const guarded = function (this: Document, ...args: Parameters<StartViewTransition>) {
    const transition = start.apply(this, args);
    const cap = setTimeout(() => transition.skipTransition(), MAX_TRANSITION_MS);
    const finished = transition.finished.catch(() => undefined).finally(() => clearTimeout(cap));
    const updateCallbackDone = transition.updateCallbackDone.catch(() => undefined);
    return new Proxy(transition, {
      get(target, key) {
        if (key === "finished") return finished;
        if (key === "updateCallbackDone") return updateCallbackDone;
        const value = Reflect.get(target, key, target);
        // Methods like skipTransition() must run on the real transition object.
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  } as StartViewTransition & { [GUARDED]?: true };
  guarded[GUARDED] = true;
  doc.startViewTransition = guarded;
}

/**
 * Whether a rejection is the browser aborting or skipping a view transition (Chrome:
 * "Transition was aborted because of invalid state", "... timeout in DOM update", "Transition
 * was skipped"). Those mean only that an animation didn't run; nothing else failed.
 */
export function isAbortedViewTransition(reason: unknown) {
  if (typeof reason !== "object" || reason === null) return false;
  const { name, message } = reason as { name?: unknown; message?: unknown };
  return (
    (name === "AbortError" || name === "InvalidStateError" || name === "TimeoutError") &&
    typeof message === "string" &&
    /^Transition was (aborted|skipped)/.test(message)
  );
}

/**
 * The second layer behind guardViewTransitions: any aborted view transition that still ends
 * up unhandled (one started outside React, or on a page loaded before the guard) is dropped
 * quietly. It listens in the capture phase so it runs before Next's dev overlay, which counts
 * every unhandled rejection as an issue. Every other rejection is left alone.
 */
export function ignoreAbortedViewTransitions(target: Pick<EventTarget, "addEventListener">) {
  target.addEventListener(
    "unhandledrejection",
    (event) => {
      if (!isAbortedViewTransition((event as PromiseRejectionEvent).reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true },
  );
}
