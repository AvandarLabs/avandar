import { describe, expect, it } from "vitest";
import { summarizeEvalRun } from "./summarizeEvalRun";
import type { GradedAnswer } from "./gradeEvalAnswer";

function _graded(id: string, isRepeat?: boolean): GradedAnswer {
  return {
    id,
    category: "try_again",
    prompt: "p",
    pass: true,
    detail: "",
    questionsAsked: 0,
    isNeedlessQuestion: false,
    isMissedQuestion: false,
    ...(isRepeat === undefined ? {} : { isRepeat }),
    answer: {
      assistantText: "",
      clarifications: [],
      consentPrompts: 0,
      valuesSentToModel: [],
      toolNames: [],
      usage: {
        calls: 1,
        promptTokens: 0,
        cachedPromptTokens: 0,
        completionTokens: 0,
        reasoningTokens: 0,
        cost: 0,
      },
      latencyMs: 0,
    },
  };
}

describe("summarizeEvalRun", () => {
  it("counts the Try again answers that repeated their first attempt", () => {
    const summary = summarizeEvalRun("run", [
      _graded("T01", true),
      _graded("T02", false),
      _graded("B01"),
    ]);

    expect(summary.repeatCount).toBe(1);
  });
});
