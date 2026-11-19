import { describe, expect, it } from "vitest";
import { gradeSchemaComparison } from "./covidSchemaQuestions";

const GOOD_ANSWER =
  "They cannot be stacked as they are. Country_Region and Country/Region differ by a character, and the US file also has Population and Admin2.";

const STACKABLE_AFTER_RENAMING_ANSWER =
  "They can be stacked, but only after renaming some columns. Stacked as they are, the columns would not line up: Province_State and Province/State, Country_Region and Country/Region, and Long_ and Long are near-matches, and the US file also has UID, iso2, iso3, code3, FIPS, Admin2, Combined_Key and Population.";

const NOT_DIRECTLY_AFTER_CLEANUP_ANSWER =
  "Short answer: not directly. The two files can be stacked only after some cleanup, because their columns are named differently. The global file uses Country/Region and Province/State, while the US file uses Country_Region and Province_State. The US file also has columns the global file lacks: Admin2, Population, FIPS, UID and Combined_Key. Renaming is needed for the shared columns, so you would first align the column names and then decide what to do with the US-only columns.";

const WILL_NOT_LINE_UP_ANSWER =
  "Stacked as stored, the columns will not line up, because the US file has Admin2 and Population and the global file does not.";

describe("gradeSchemaComparison", () => {
  it("passes a reply that names a real column difference", () => {
    expect(gradeSchemaComparison(GOOD_ANSWER).pass).toBe(true);
  });

  it("passes a reply that says the files stack after renaming and the columns would not line up", () => {
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

  it("passes a reply that says the columns won't line up", () => {
    expect(
      gradeSchemaComparison(
        "Stacked as stored, the columns won't line up, because the US file has Admin2 and Population.",
      ).pass,
    ).toBe(true);
  });

  it("fails a reply that says the files stack without renaming anything", () => {
    expect(
      gradeSchemaComparison(
        "They can be stacked as they are without renaming anything. The US file adds Admin2.",
      ).pass,
    ).toBe(false);
  });

  it("passes a reply that says the files stack only after cleanup and opens with not directly", () => {
    expect(gradeSchemaComparison(NOT_DIRECTLY_AFTER_CLEANUP_ANSWER).pass).toBe(
      true,
    );
  });

  it("passes a short reply that opens with not directly", () => {
    expect(
      gradeSchemaComparison(
        "Not directly. Their columns are named differently, so you would need to align them first, and the US file has Admin2 and Population.",
      ).pass,
    ).toBe(true);
  });

  it("passes a reply that says renaming is needed", () => {
    expect(
      gradeSchemaComparison(
        "Renaming is needed first: the US file uses Country_Region where the global file uses Country/Region.",
      ).pass,
    ).toBe(true);
  });

  it("fails a reply that says the files stack directly with no renaming needed", () => {
    expect(
      gradeSchemaComparison(
        "Yes they can be stacked directly, no renaming needed, the US file adds Admin2 and Population.",
      ).pass,
    ).toBe(false);
  });

  it("fails a reply that says the files are directly stackable with nothing to rename", () => {
    expect(
      gradeSchemaComparison(
        "Directly stackable, nothing to rename. The US file adds Admin2.",
      ).pass,
    ).toBe(false);
  });

  it("fails a reply that says no renaming is needed", () => {
    expect(
      gradeSchemaComparison(
        "No renaming is needed, they stack directly. The US file adds Admin2.",
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
