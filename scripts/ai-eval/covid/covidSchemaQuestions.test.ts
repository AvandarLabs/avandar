import { describe, expect, it } from "vitest";
import { gradeSchemaComparison } from "./covidSchemaQuestions";

const GOOD_ANSWER =
  "They cannot be stacked as they are. Country_Region and Country/Region differ by a character, and the US file also has Population and Admin2.";

const STACKABLE_AFTER_RENAMING_ANSWER =
  "They can be stacked, but only after renaming some columns. Stacked as they are, the columns would not line up: Province_State and Province/State, Country_Region and Country/Region, and Long_ and Long are near-matches, and the US file also has UID, iso2, iso3, code3, FIPS, Admin2, Combined_Key and Population.";

const WILL_NOT_LINE_UP_ANSWER =
  "Stacked as stored, the columns will not line up, because the US file has Admin2 and Population and the global file does not.";

describe("gradeSchemaComparison", () => {
  it("passes a reply that names a real column difference", () => {
    expect(gradeSchemaComparison(GOOD_ANSWER).pass).toBe(true);
  });

  it("passes a reply that says the files stack only after renaming", () => {
    expect(gradeSchemaComparison(STACKABLE_AFTER_RENAMING_ANSWER).pass).toBe(
      true,
    );
  });

  it("passes a reply that says the columns will not line up", () => {
    expect(gradeSchemaComparison(WILL_NOT_LINE_UP_ANSWER).pass).toBe(true);
  });

  it("fails a reply that names a difference but says the files stack as they are", () => {
    expect(
      gradeSchemaComparison(
        "Yes, they can be stacked as they are. The US file adds Admin2 and Population, which stay empty for the global rows.",
      ).pass,
    ).toBe(false);
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
