import { describe, expect, it } from "vitest";
import { setupSteps, showSetup, type SetupInput } from "./setup";

const owner: SetupInput = {
  slug: "example",
  can: { upload: true, invite: true, review: true, assign: true },
  callCount: 0,
  teamSize: 1,
  reviewedCount: 0,
  taskCount: 0,
};

describe("setupSteps", () => {
  it("gives a new owner every step, none done", () => {
    const steps = setupSteps(owner);
    expect(steps.map((s) => s.id)).toEqual(["upload", "invite", "review", "assign"]);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("ticks steps off from what's in the workspace", () => {
    const steps = setupSteps({ ...owner, callCount: 3, teamSize: 2, reviewedCount: 1, taskCount: 0 });
    expect(steps.filter((s) => s.done).map((s) => s.id)).toEqual(["upload", "invite", "review"]);
  });

  it("counts an open invite as inviting the team", () => {
    expect(setupSteps({ ...owner, teamSize: 2 }).find((s) => s.id === "invite")?.done).toBe(true);
  });

  it("leaves out steps the viewer isn't allowed to do", () => {
    const rep = { ...owner, can: { upload: true, invite: false, review: false, assign: false } };
    expect(setupSteps(rep).map((s) => s.id)).toEqual(["upload"]);
  });

  it("links into the company's own pages", () => {
    expect(setupSteps(owner)[1].action.href).toBe("/example/settings/members");
  });
});

describe("showSetup", () => {
  it("shows while there's setup left", () => {
    expect(showSetup(setupSteps(owner), false)).toBe(true);
  });

  it("hides once every step is done", () => {
    const all = setupSteps({ ...owner, callCount: 1, teamSize: 2, reviewedCount: 1, taskCount: 1 });
    expect(showSetup(all, false)).toBe(false);
  });

  it("hides when the viewer hid it", () => {
    expect(showSetup(setupSteps(owner), true)).toBe(false);
  });

  it("isn't shown to someone with a single step, like a rep", () => {
    const rep = { ...owner, can: { upload: true, invite: false, review: false, assign: false } };
    expect(showSetup(setupSteps(rep), false)).toBe(false);
  });
});
