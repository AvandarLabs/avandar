import { describe, expect, it } from "vitest";
import { gradeSchemaComparison } from "./covidSchemaQuestions";

const GOOD_ANSWER =
  "They cannot be stacked as they are. Country_Region and Country/Region differ by a character, and the US file also has Population and Admin2.";

describe("gradeSchemaComparison", () => {
  it("passes a reply that names a real column difference", () => {
    expect(gradeSchemaComparison(GOOD_ANSWER).pass).toBe(true);
  });

  it("fails a reply that says the columns match", () => {
    expect(
      gradeSchemaComparison(
        "Yes, they have the same columns and can be appended directly.",
      ).pass,
    ).toBe(false);
  });

  it("fails a reply that never names a differing column", () => {
    expect(
      gradeSchemaComparison(
        "They are not the same, so you would need to rename columns first.",
      ).pass,
    ).toBe(false);
  });
});
