import { describe, expect, it } from "vitest";
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
});
