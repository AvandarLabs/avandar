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
});
