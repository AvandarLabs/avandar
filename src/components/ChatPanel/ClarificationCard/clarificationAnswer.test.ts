import { describe, expect, it } from "vitest";
import {
  clarificationAnswerNeedsCrossBoundary,
  formatClarificationAnswerForThread,
} from "./clarificationAnswer";

describe("formatClarificationAnswerForThread", () => {
  it("formats none of the above", () => {
    expect(formatClarificationAnswerForThread({ kind: "none_of_above" })).toBe(
      "[Clarification answer: (none of the listed options)]",
    );
  });

  it("formats custom answers", () => {
    expect(
      formatClarificationAnswerForThread({
        kind: "custom",
        text: "  Western region  ",
      }),
    ).toBe("[Clarification answer: (custom answer: Western region)]");
  });

  it("formats preset single and multi", () => {
    expect(
      formatClarificationAnswerForThread({
        kind: "preset",
        value: "North",
      }),
    ).toBe("[Clarification answer: North]");
    expect(
      formatClarificationAnswerForThread({
        kind: "preset",
        value: ["North", "South"],
      }),
    ).toBe("[Clarification answer: North, South]");
  });
});

describe("clarificationAnswerNeedsCrossBoundary", () => {
  it("requires crossBoundary for custom text", () => {
    expect(
      clarificationAnswerNeedsCrossBoundary(
        { kind: "custom", text: "my metric" },
        { kind: "fixed_options", options: ["A", "B"], multi: false },
      ),
    ).toBe(true);
  });

  it("requires crossBoundary for discovery preset picks", () => {
    expect(
      clarificationAnswerNeedsCrossBoundary(
        { kind: "preset", value: "CA" },
        {
          kind: "discovery",
          query: 'SELECT DISTINCT "state" FROM "t"',
          column: "state",
          multi: false,
        },
      ),
    ).toBe(true);
  });

  it("skips crossBoundary for fixed_options preset picks", () => {
    expect(
      clarificationAnswerNeedsCrossBoundary(
        { kind: "preset", value: "North" },
        { kind: "fixed_options", options: ["North", "South"], multi: false },
      ),
    ).toBe(false);
  });

  it("skips crossBoundary for none of the above", () => {
    expect(
      clarificationAnswerNeedsCrossBoundary(
        { kind: "none_of_above" },
        { kind: "fixed_options", options: ["North", "South"], multi: false },
      ),
    ).toBe(false);
  });
});
