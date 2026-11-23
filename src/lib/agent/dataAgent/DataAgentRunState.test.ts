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

    const next = beginDataAgentRun(previous, "Try again");

    expect(next.userTexts).toEqual([
      "Are the two datasets appendable?",
      "Try again",
    ]);
    expect(next.queryRuns).toBe(0);
    expect(next.needsEscalation).toBe(false);
    expect(next.lastQuery).toBeUndefined();
  });
});
