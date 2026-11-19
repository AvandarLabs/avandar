import { describe, expect, it } from "vitest";
import { buildBaselineTryAgainTurn } from "./BaselineHarness";

const QUESTION = [
  { role: "user", content: "Which state had the most covid?" },
] as const;

describe("buildBaselineTryAgainTurn", () => {
  it("drops the trailing assistant message, as assistant-ui does", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: [...QUESTION, { role: "assistant", content: "California." }],
      lastResult: { assistantText: "California." },
    });

    expect(turn.messages).toEqual(QUESTION);
  });

  it("describes the last response's SQL", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: { assistantText: "", generatedSql: { sql: "SELECT 1" } },
    });

    expect(turn.retryContext).toEqual({ priorGeneratedSql: "SELECT 1" });
  });

  it("describes the last response's card question", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: {
        assistantText: "Which one?",
        clarification: { question: "Deaths or cases?" },
      },
    });

    expect(turn.retryContext).toEqual({
      priorAssistantText: "Which one?",
      priorClarificationQuestion: "Deaths or cases?",
    });
  });

  it("describes the last response's block kind", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: {
        assistantText: "",
        dashboardBlock: { kind: "HeadingBlock" },
      },
    });

    expect(turn.retryContext).toEqual({
      priorDashboardBlockKind: "HeadingBlock",
    });
  });

  it("sends no retry context when the last call failed", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: undefined,
    });

    expect(turn.retryContext).toBeUndefined();
  });
});
