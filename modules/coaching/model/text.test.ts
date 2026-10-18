import { describe, expect, it } from "vitest";
import { unquote } from "./text";

describe("unquote", () => {
  it("strips wrapping quote marks", () => {
    expect(unquote(`"I can take care of that for you."`)).toBe("I can take care of that for you.");
    expect(unquote("“Does Tuesday work?”")).toBe("Does Tuesday work?");
  });

  it("strips stray JSON punctuation left at the end", () => {
    expect(unquote(`Would Tuesday or Wednesday work better?"}],`)).toBe("Would Tuesday or Wednesday work better?");
  });

  it("keeps ordinary text untouched", () => {
    expect(unquote("We'll see you Friday, then.")).toBe("We'll see you Friday, then.");
  });
});
