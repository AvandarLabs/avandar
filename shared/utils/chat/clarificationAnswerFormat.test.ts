import { describe, expect, it } from "vitest";
import {
  buildClarificationAnswerLine,
  clarificationAnswerToLine,
  isClarificationAnswerLine,
  parseClarificationAnswerBody,
} from "$/utils/chat/clarificationAnswerFormat.ts";

describe("clarificationAnswerFormat", () => {
  it("formats each answer kind into a thread line", () => {
    expect(clarificationAnswerToLine({ kind: "none_of_above" })).toBe(
      "[Clarification answer: (none of the listed options)]",
    );
    expect(clarificationAnswerToLine({ kind: "custom", text: " West " })).toBe(
      "[Clarification answer: (custom answer: West)]",
    );
    expect(clarificationAnswerToLine({ kind: "preset", value: "US" })).toBe(
      "[Clarification answer: US]",
    );
    expect(
      clarificationAnswerToLine({ kind: "preset", value: ["N", "S"] }),
    ).toBe("[Clarification answer: N, S]");
  });

  it("builds a line from a body", () => {
    expect(buildClarificationAnswerLine("US")).toBe(
      "[Clarification answer: US]",
    );
  });

  it("detects clarification answer lines", () => {
    expect(isClarificationAnswerLine("[Clarification answer: US]")).toBe(true);
    expect(isClarificationAnswerLine("How many cases in the US?")).toBe(false);
  });

  it("parses the body back out of a line", () => {
    expect(parseClarificationAnswerBody("[Clarification answer: US]")).toBe(
      "US",
    );
    expect(parseClarificationAnswerBody("plain question")).toBeUndefined();
  });
});
