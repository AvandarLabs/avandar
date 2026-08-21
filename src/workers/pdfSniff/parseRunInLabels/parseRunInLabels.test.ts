import { describe, expect, it } from "vitest";
import { parseRunInLabels } from "./parseRunInLabels";
import type { TextLine } from "../pdfSniff.types";

function line(text: string, y: number, fontName = "body"): TextLine {
  return {
    y,
    text,
    items: [
      {
        text,
        x: 100,
        y,
        width: text.length * 4,
        height: 9,
        fontName,
        unmappedCharRatio: 0,
      },
    ],
  };
}

describe("parseRunInLabels", () => {
  it("splits a numbered heading from its labelled paragraphs", () => {
    const blocks = parseRunInLabels([
      line("1. Surveillance, early detection and case management", 500, "bold"),
      line("Responses: To strengthen outbreak surveillance", 480),
      line("Challenges: Reporting delays hinder confirmation", 460),
      line("Priorities: Maintaining and expanding CTCs", 440),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.heading).toBe(
      "Surveillance, early detection and case management",
    );
    expect(blocks[0]!.number).toBe(1);
    expect(blocks[0]!.fields).toEqual({
      Responses: "To strengthen outbreak surveillance",
      Challenges: "Reporting delays hinder confirmation",
      Priorities: "Maintaining and expanding CTCs",
    });
  });

  it("joins a field that wraps onto following lines", () => {
    const blocks = parseRunInLabels([
      line("2. Water quality", 500, "bold"),
      line("Responses: Providing safe water and proper", 480),
      line("sanitation is central to stopping cholera.", 460),
      line("Challenges: One in four water sources is unsafe", 440),
    ]);

    expect(blocks[0]!.fields.Responses).toBe(
      "Providing safe water and proper sanitation is central to stopping cholera.",
    );
  });

  it("returns several blocks from one region", () => {
    const blocks = parseRunInLabels([
      line("1. Surveillance", 500, "bold"),
      line("Responses: A", 480),
      line("2. Water quality", 440, "bold"),
      line("Responses: B", 420),
    ]);

    expect(
      blocks.map((b) => {
        return b.number;
      }),
    ).toEqual([1, 2]);
  });

  it("ignores a colon in the middle of a sentence", () => {
    // "at 09:00" and "the following: a, b" must not become field labels.
    const blocks = parseRunInLabels([
      line("1. Logistics", 500, "bold"),
      line("Responses: Deliveries arrive at 09:00 daily", 480),
    ]);

    expect(Object.keys(blocks[0]!.fields)).toEqual(["Responses"]);
    expect(blocks[0]!.fields.Responses).toBe(
      "Deliveries arrive at 09:00 daily",
    );
  });

  it("returns nothing when there is no numbered heading", () => {
    const blocks = parseRunInLabels([
      line("Just a paragraph of prose with no structure at all.", 500),
    ]);

    expect(blocks).toEqual([]);
  });

  it("handles a heading with no number", () => {
    // FUNDING and HIGHLIGHTS are section headings in the same documents.
    const blocks = parseRunInLabels([
      line("FUNDING", 500, "bold"),
      line("Responses: Partners require $50 million", 480),
    ]);

    expect(blocks[0]!.number).toBeNull();
    expect(blocks[0]!.heading).toBe("FUNDING");
  });
});
