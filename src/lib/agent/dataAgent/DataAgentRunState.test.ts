import { describe, expect, it } from "vitest";
import {
  beginDataAgentRun,
  createDataAgentRunState,
} from "./DataAgentRunState";

describe("beginDataAgentRun", () => {
  it("keeps earlier user texts and clears the previous query", () => {
    const previous = createDataAgentRunState();
    previous.userTexts = ["Are the two datasets appendable?"];
    previous.queryRuns = 2;
    previous.needsEscalation = true;
    previous.lastQuery = {
      sql: "SELECT 1",
      summary: "One row.",
      outcome: { kind: "rows", columns: [], rowCount: 1 },
    };

    const next = beginDataAgentRun(previous, "Try again");

    expect(next.userTexts).toEqual([
      "Are the two datasets appendable?",
      "Try again",
    ]);
    expect(next.queryRuns).toBe(0);
    expect(next.needsEscalation).toBe(false);
    expect(next.lastQuery).toBeUndefined();
  });

  it("clears the previous query when merged into the live state", () => {
    const previous = createDataAgentRunState();
    previous.lastQuery = {
      sql: "SELECT 1",
      summary: "One row.",
      outcome: { kind: "rows", columns: [], rowCount: 1 },
    };

    const merged = { ...previous, ...beginDataAgentRun(previous, "Again") };

    expect(merged.lastQuery).toBeUndefined();
  });

  it("clears the dashboard block the previous answer added", () => {
    const previous = createDataAgentRunState();
    previous.dashboardBlock = { summary: "Added a heading to COVID 2022." };

    const merged = { ...previous, ...beginDataAgentRun(previous, "Again") };

    expect(merged.dashboardBlock).toBeUndefined();
  });
});
