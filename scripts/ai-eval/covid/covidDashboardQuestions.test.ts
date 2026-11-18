import { describe, expect, it } from "vitest";
import { DASHBOARD_QUESTIONS } from "./covidDashboardQuestions";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { ExpectedDashboardWrite } from "../EvalQuestion";

function _expectedWriteOf(id: string): ExpectedDashboardWrite {
  const expected = DASHBOARD_QUESTIONS.find((question) => {
    return question.id === id;
  })?.expectedWrite;
  if (expected === undefined || expected === "none") {
    throw new Error(`${id} expects no write`);
  }
  return expected;
}

function _chartBlock(
  vizType: Extract<ChatGeneratedDashboardBlock, { kind: "DataViz" }>["vizType"],
): ChatGeneratedDashboardBlock {
  return { kind: "DataViz", prompt: "Chart", sql: "SELECT 1", vizType };
}

function _gradeMissingDashboardReply(reply: string): boolean {
  const question = DASHBOARD_QUESTIONS.find((candidate) => {
    return candidate.id === "D08";
  });
  if (question?.gradeText === undefined) {
    throw new Error("D08 has no gradeText");
  }
  return question.gradeText(reply).pass;
}

describe("DASHBOARD_QUESTIONS", () => {
  it.each(["D07", "D09"])("%s asks for a chart, so a table fails", (id) => {
    const expected = _expectedWriteOf(id);

    expect(expected.checkBlock?.(_chartBlock("table")).pass).toBe(false);
    expect(expected.checkBlock?.(_chartBlock("line")).pass).toBe(true);
  });

  it("keeps every question's ids unique", () => {
    const ids = DASHBOARD_QUESTIONS.map((question) => {
      return question.id;
    });

    expect(new Set(ids).size).toBe(ids.length);
  });

  describe("D08 grades a reply about a missing dashboard", () => {
    it.each([
      "I don't have a dashboard named Budget.",
      "I don\u2019t have a dashboard called Budget.",
      "I do not have a Budget dashboard.",
      "I can't find a dashboard named Budget.",
      "I cannot find the Budget dashboard.",
      "I couldn't find a Budget dashboard in this workspace.",
      "I could not find a dashboard named Budget.",
      "There is no dashboard named Budget.",
      "No dashboard called Budget matched.",
      "There's no dashboard matching Budget.",
      "There is no Budget dashboard.",
      "That dashboard doesn't exist.",
      "The Budget dashboard does not exist.",
      "Budget isn't a dashboard in this workspace.",
    ])("accepts %s", (reply) => {
      expect(_gradeMissingDashboardReply(reply)).toBe(true);
    });

    it.each([
      "Added to Budget.",
      "I've added a Spending heading to the Budget dashboard.",
      "Done. The heading now sits on the Budget dashboard.",
      "",
    ])("rejects a reply that claims success: %s", (reply) => {
      expect(_gradeMissingDashboardReply(reply)).toBe(false);
    });
  });
});
