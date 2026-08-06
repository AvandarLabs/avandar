import { describe, expect, it } from "vitest";
import {
  collectApprovedClarificationValues,
  countClarificationAnswersInThread,
  extractSingleQuotedSqlLiterals,
  reviewGeneratedSqlAssumptions,
} from "./generatedSqlAssumptions";

describe("countClarificationAnswersInThread", () => {
  it("counts clarification answer markers on user messages only", () => {
    expect(
      countClarificationAnswersInThread([
        { role: "user", content: "show revenue" },
        { role: "assistant", content: "[Clarification answer: North]" },
        { role: "user", content: "[Clarification answer: North]" },
        {
          role: "user",
          content: "[Clarification answer: (custom answer: west)]",
        },
      ]),
    ).toBe(2);
  });
});

describe("collectApprovedClarificationValues", () => {
  it("collects preset and custom answers but not none-of-above", () => {
    const approved = collectApprovedClarificationValues([
      { role: "user", content: "[Clarification answer: North, South]" },
      {
        role: "user",
        content: "[Clarification answer: (custom answer: West)]",
      },
      {
        role: "user",
        content: "[Clarification answer: (none of the listed options)]",
      },
    ]);
    expect([...approved].sort()).toEqual(["north", "south", "west"]);
  });
});

describe("extractSingleQuotedSqlLiterals", () => {
  it("extracts escaped single-quoted strings", () => {
    expect(
      extractSingleQuotedSqlLiterals(
        `SELECT * FROM "t" WHERE "region" = 'North' AND "note" = 'O''Reilly'`,
      ),
    ).toEqual(["North", "O'Reilly"]);
  });
});

describe("reviewGeneratedSqlAssumptions", () => {
  const threeAnswers = [
    {
      role: "user",
      content: "[Clarification answer: (none of the listed options)]",
    },
    {
      role: "user",
      content: "[Clarification answer: (custom answer: metric A)]",
    },
    { role: "user", content: "[Clarification answer: North]" },
  ] as const;

  it("flags unapproved literals after the clarification cap", () => {
    const review = reviewGeneratedSqlAssumptions({
      sql: `SELECT 1 FROM "d" WHERE "region" = 'AssumedWest'`,
      messages: [...threeAnswers],
    });
    expect(review.assumptionCapReached).toBe(true);
    expect(review.needsApproval).toBe(true);
    expect(review.unapprovedValues).toEqual(["AssumedWest"]);
  });

  it("allows literals that match an approved clarification value", () => {
    const review = reviewGeneratedSqlAssumptions({
      sql: `SELECT 1 FROM "d" WHERE "region" = 'North'`,
      messages: [...threeAnswers],
    });
    expect(review.needsApproval).toBe(false);
  });

  it("flags PII-like literals even before the cap", () => {
    const review = reviewGeneratedSqlAssumptions({
      sql: `SELECT 1 FROM "d" WHERE "email" = 'user@example.com'`,
      messages: [{ role: "user", content: "show me users" }],
    });
    expect(review.assumptionCapReached).toBe(false);
    expect(review.needsApproval).toBe(true);
    expect(review.unapprovedValues).toContain("user@example.com");
  });
});
