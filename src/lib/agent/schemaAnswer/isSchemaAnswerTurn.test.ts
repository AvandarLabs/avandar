import { describe, expect, it } from "vitest";
import {
  buildAgentTurnText,
  TRY_AGAIN_LINE,
} from "$/agent/pageContext/buildAgentTurnText";
import { isSchemaAnswerTurn } from "./isSchemaAnswerTurn";

describe("isSchemaAnswerTurn", () => {
  it("treats a column comparison as already answered by the schema", () => {
    expect(
      isSchemaAnswerTurn([
        "look at the two immunization survey datasets. are they appendable? do they have same or similar columns?",
      ]),
    ).toBe(true);
  });

  it("treats a retry of that question as the same kind of turn", () => {
    expect(
      isSchemaAnswerTurn([
        "Are the US deaths and global deaths datasets appendable? Do they have the same columns?",
        "That query failed. Please fix the SQL and try again.",
      ]),
    ).toBe(true);
    expect(
      isSchemaAnswerTurn([
        "Do these two datasets have similar columns?",
        "Try again",
      ]),
    ).toBe(true);
  });

  it("leaves a question about rows to the explorer", () => {
    expect(
      isSchemaAnswerTurn(["Show me monthly covid deaths in the US in 2022"]),
    ).toBe(false);
    expect(
      isSchemaAnswerTurn([
        "Are the US deaths and global deaths datasets appendable?",
        "Now show deaths in Texas in 2022",
      ]),
    ).toBe(false);
  });

  const S01 =
    "Look at long-us-deaths.csv and long-global-deaths.csv. Are they appendable? Do they have the same or similar columns?";
  const PAGE_BLOCK = "<current_page>\nPage: Data Explorer\n</current_page>";

  function _retryText(message: string): string {
    return buildAgentTurnText({
      message,
      pageBlock: PAGE_BLOCK,
      isRetry: true,
    });
  }

  it("does not read the Try again line alone as a column question", () => {
    expect(isSchemaAnswerTurn([TRY_AGAIN_LINE])).toBe(false);
  });

  it("keeps a retried column question a column question", () => {
    expect(isSchemaAnswerTurn([S01, _retryText(S01)])).toBe(true);
  });

  it("leaves a retried question about rows to the explorer after a column question", () => {
    expect(isSchemaAnswerTurn([S01, _retryText("show me deaths")])).toBe(false);
  });
});
