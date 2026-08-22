import { describe, expect, it } from "vitest";

import { ClarificationAnswer } from "./ClarificationAnswer";

describe("ClarificationAnswer.formatForThread", () => {
  it("formats none of the above", () => {
    expect(ClarificationAnswer.formatForThread({ kind: "none_of_above" })).toBe(
      "[Clarification answer: (none of the listed options)]",
    );
  });

  it("formats custom answers", () => {
    expect(
      ClarificationAnswer.formatForThread({
        kind: "custom",
        text: "  Western region  ",
      }),
    ).toBe("[Clarification answer: (custom answer: Western region)]");
  });

  it("formats preset single and multi", () => {
    expect(
      ClarificationAnswer.formatForThread({
        kind: "preset",
        value: "North",
      }),
    ).toBe("[Clarification answer: North]");
    expect(
      ClarificationAnswer.formatForThread({
        kind: "preset",
        value: ["North", "South"],
      }),
    ).toBe("[Clarification answer: North, South]");
  });
});

describe("ClarificationAnswer.needsCrossBoundary", () => {
  it("requires crossBoundary for custom text", () => {
    expect(
      ClarificationAnswer.needsCrossBoundary({
        answer: { kind: "custom", text: "my metric" },
        responseShape: {
          kind: "fixed_options",
          options: ["A", "B"],
          multi: false,
        },
      }),
    ).toBe(true);
  });

  it("requires crossBoundary for discovery preset picks", () => {
    expect(
      ClarificationAnswer.needsCrossBoundary({
        answer: { kind: "preset", value: "CA" },
        responseShape: {
          kind: "discovery",
          query: 'SELECT DISTINCT "state" FROM "t"',
          column: "state",
          multi: false,
          candidateValues: ["CA"],
        },
      }),
    ).toBe(true);
  });

  it("skips crossBoundary for fixed-options preset picks", () => {
    expect(
      ClarificationAnswer.needsCrossBoundary({
        answer: { kind: "preset", value: "North" },
        responseShape: {
          kind: "fixed_options",
          options: ["North", "South"],
          multi: false,
        },
      }),
    ).toBe(false);
  });

  it("skips crossBoundary for none of the above", () => {
    expect(
      ClarificationAnswer.needsCrossBoundary({
        answer: { kind: "none_of_above" },
        responseShape: {
          kind: "fixed_options",
          options: ["North", "South"],
          multi: false,
        },
      }),
    ).toBe(false);
  });
});
