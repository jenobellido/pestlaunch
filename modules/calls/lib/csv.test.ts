import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("leaves plain values alone and empties null", () => {
    expect(csvCell("Booked")).toBe("Booked");
    expect(csvCell(12)).toBe("12");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("Ants, spiders")).toBe('"Ants, spiders"');
    expect(csvCell('She said "maybe"')).toBe('"She said ""maybe"""');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvCell("+1 555 0100")).toBe("'+1 555 0100");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
});

describe("toCsv", () => {
  it("joins a header and rows with CRLF line endings", () => {
    expect(toCsv(["Call", "Score"], [["Demo call", 9], ["Other, call", null]])).toBe(
      'Call,Score\r\nDemo call,9\r\n"Other, call",\r\n',
    );
  });
});
