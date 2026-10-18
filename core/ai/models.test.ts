import { describe, expect, it } from "vitest";
import { modelOrder } from "./models";

const config = { main: "big", fallback: "small", fast: "small" };

describe("modelOrder", () => {
  it("uses the main model first for the best tier", () => {
    expect(modelOrder("best", config)).toEqual(["big", "small"]);
  });

  it("uses the fast model first for the fast tier, then falls back to the main one", () => {
    expect(modelOrder("fast", config)).toEqual(["small", "big"]);
    expect(modelOrder("fast", { main: "big", fallback: "medium", fast: "tiny" })).toEqual(["tiny", "big", "medium"]);
  });

  it("makes the fast tier use the main model when no fast model is set", () => {
    expect(modelOrder("fast", { ...config, fast: "" })).toEqual(["big", "small"]);
    expect(modelOrder("fast", { ...config, fast: "  " })).toEqual(["big", "small"]);
  });

  it("drops an empty fallback", () => {
    expect(modelOrder("best", { ...config, fallback: "" })).toEqual(["big"]);
  });

  it("moves models still inside a usage limit to the end", () => {
    const limited = new Map([["small", 2_000]]);
    expect(modelOrder("fast", config, limited, 1_000)).toEqual(["big", "small"]);
    // Once the limit has passed, the order is back to normal.
    expect(modelOrder("fast", config, limited, 3_000)).toEqual(["small", "big"]);
  });
});
