import { afterEach, describe, expect, it, vi } from "vitest";
import { guardViewTransitions, ignoreAbortedViewTransitions, isAbortedViewTransition, MAX_TRANSITION_MS } from "./view-transitions";

/** A stand-in for a ViewTransition the browser aborted: finished and updateCallbackDone reject. */
function abortedTransition() {
  const abort = new Error("Transition was aborted because of invalid state");
  const transition = {
    finished: Promise.reject(abort),
    updateCallbackDone: Promise.reject(abort),
    ready: Promise.resolve(),
    types: new Set<string>(),
    skipTransition: vi.fn(function (this: unknown) {
      return this;
    }),
  };
  // The fake's own promises are handled here; the test is about what the caller sees.
  transition.finished.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  return transition as unknown as ViewTransition & { skipTransition: ReturnType<typeof vi.fn> };
}

/** A transition whose animations never finish, e.g. because no frames are being painted. */
function stalledTransition() {
  let finish: () => void = () => {};
  const transition = {
    finished: new Promise<void>((resolve) => (finish = resolve)),
    updateCallbackDone: Promise.resolve(),
    ready: Promise.resolve(),
    types: new Set<string>(),
    skipTransition: vi.fn(() => finish()),
  };
  return transition as unknown as ViewTransition & { skipTransition: ReturnType<typeof vi.fn> };
}

function fakeDocument(make: () => ViewTransition = abortedTransition) {
  const start = vi.fn(() => make());
  return { doc: { startViewTransition: start } as unknown as Pick<Document, "startViewTransition">, start };
}

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  unhandled.length = 0;
  vi.useRealTimers();
});

describe("guardViewTransitions", () => {
  it("makes finished and updateCallbackDone resolve when the browser aborts the transition", async () => {
    const { doc } = fakeDocument();
    guardViewTransitions(doc);
    const transition = doc.startViewTransition(() => {});
    await expect(transition.finished).resolves.toBeUndefined();
    await expect(transition.updateCallbackDone).resolves.toBeUndefined();
  });

  it("leaves no unhandled rejection when callers chain .finally() like React does", async () => {
    process.on("unhandledRejection", onUnhandled);
    const { doc } = fakeDocument();
    guardViewTransitions(doc);
    const transition = doc.startViewTransition(() => {});
    transition.finished.finally(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(unhandled).toEqual([]);
  });

  it("passes arguments through and keeps ready, types and methods working", async () => {
    const { doc, start } = fakeDocument();
    guardViewTransitions(doc);
    const options = { update: () => {}, types: ["nav"] };
    const transition = doc.startViewTransition(options);
    expect(start).toHaveBeenCalledWith(options);
    await expect(transition.ready).resolves.toBeUndefined();
    expect(transition.types).toBeInstanceOf(Set);
    transition.skipTransition();
    const real = start.mock.results[0].value;
    expect(real.skipTransition).toHaveBeenCalledOnce();
    // Bound to the real transition, not the wrapper.
    expect(real.skipTransition.mock.contexts[0]).toBe(real);
  });

  it("wraps only once", () => {
    const { doc } = fakeDocument();
    guardViewTransitions(doc);
    const once = doc.startViewTransition;
    guardViewTransitions(doc);
    expect(doc.startViewTransition).toBe(once);
  });

  it("does nothing where view transitions aren't supported", () => {
    const doc = {} as Pick<Document, "startViewTransition">;
    expect(() => guardViewTransitions(doc)).not.toThrow();
    expect(doc.startViewTransition).toBeUndefined();
  });

  it("skips a transition that runs too long, so navigation never waits on it", async () => {
    vi.useFakeTimers();
    const { doc, start } = fakeDocument(stalledTransition);
    guardViewTransitions(doc);
    const transition = doc.startViewTransition(() => {});
    const real = start.mock.results[0].value;

    vi.advanceTimersByTime(MAX_TRANSITION_MS - 1);
    expect(real.skipTransition).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(real.skipTransition).toHaveBeenCalledOnce();
    await expect(transition.finished).resolves.toBeUndefined();
  });

  it("doesn't skip a transition that finished in time", async () => {
    vi.useFakeTimers();
    const { doc, start } = fakeDocument(stalledTransition);
    guardViewTransitions(doc);
    const transition = doc.startViewTransition(() => {});
    const real = start.mock.results[0].value;

    real.skipTransition(); // finishes it, as the browser would at the end of the animations
    await transition.finished;
    real.skipTransition.mockClear();
    vi.advanceTimersByTime(MAX_TRANSITION_MS * 2);
    expect(real.skipTransition).not.toHaveBeenCalled();
  });
});

/** A DOMException-like reason, as the browser rejects with. */
const domError = (name: string, message: string) => Object.assign(new Error(message), { name });

describe("isAbortedViewTransition", () => {
  it.each([
    ["InvalidStateError", "Transition was aborted because of invalid state"],
    ["TimeoutError", "Transition was aborted because of timeout in DOM update"],
    ["AbortError", "Transition was skipped"],
  ])("recognises %s from an aborted transition", (name, message) => {
    expect(isAbortedViewTransition(domError(name, message))).toBe(true);
  });

  it("leaves every other rejection alone", () => {
    expect(isAbortedViewTransition(domError("InvalidStateError", "The object is in an invalid state."))).toBe(false);
    expect(isAbortedViewTransition(domError("AbortError", "The user aborted a request."))).toBe(false);
    expect(isAbortedViewTransition(new Error("Transition was aborted"))).toBe(false);
    expect(isAbortedViewTransition("Transition was aborted")).toBe(false);
    expect(isAbortedViewTransition(null)).toBe(false);
  });
});

describe("ignoreAbortedViewTransitions", () => {
  function rejection(reason: unknown) {
    return Object.assign(new Event("unhandledrejection", { cancelable: true }), { reason });
  }

  it("silences aborted transitions before later listeners (like Next's overlay) see them", () => {
    const target = new EventTarget();
    ignoreAbortedViewTransitions(target);
    const later = vi.fn();
    target.addEventListener("unhandledrejection", later);
    const event = rejection(domError("InvalidStateError", "Transition was aborted because of invalid state"));
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(later).not.toHaveBeenCalled();
  });

  it("passes every other rejection through", () => {
    const target = new EventTarget();
    ignoreAbortedViewTransitions(target);
    const later = vi.fn();
    target.addEventListener("unhandledrejection", later);
    const event = rejection(new Error("Database is down"));
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(later).toHaveBeenCalledOnce();
  });
});

