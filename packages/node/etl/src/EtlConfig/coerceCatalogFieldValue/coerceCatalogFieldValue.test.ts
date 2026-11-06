import { coerceCatalogFieldValue } from "@etl/EtlConfig/coerceCatalogFieldValue/coerceCatalogFieldValue";
import { describe, expect, it } from "vitest";

describe("coerceCatalogFieldValue", () => {
  describe("text fields", () => {
    it("trims a string", () => {
      expect(
        coerceCatalogFieldValue({ field: "description", value: "  Trips  " }),
      ).toEqual({ value: "Trips" });
    });

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["a blank string", "   "],
    ])("treats %s as no value, without a problem", (_name, value) => {
      expect(coerceCatalogFieldValue({ field: "license", value })).toEqual({
        value: undefined,
      });
    });

    it("reports a value that is not a string", () => {
      expect(
        coerceCatalogFieldValue({ field: "organization2_name", value: 7 }),
      ).toEqual({ value: undefined, problem: "expected text, got number" });
    });
  });

  describe("text array fields", () => {
    it("wraps a string into a one-item array", () => {
      expect(
        coerceCatalogFieldValue({ field: "domains", value: "Health" }),
      ).toEqual({ value: ["Health"] });
    });

    it("trims, drops blanks, and drops duplicates in order", () => {
      expect(
        coerceCatalogFieldValue({
          field: "tags",
          value: [" taxi ", "", "fhv", "taxi"],
        }),
      ).toEqual({ value: ["taxi", "fhv"] });
    });

    it("treats an array with nothing left as no value", () => {
      expect(
        coerceCatalogFieldValue({ field: "tags", value: ["", "  "] }),
      ).toEqual({ value: undefined });
    });

    it("reports an array holding a non-string", () => {
      expect(
        coerceCatalogFieldValue({ field: "canonical_urls", value: ["a", 1] }),
      ).toEqual({
        value: undefined,
        problem: "expected text or a list of text, got a list holding number",
      });
    });
  });

  describe("date fields", () => {
    it("parses an ISO 8601 string", () => {
      expect(
        coerceCatalogFieldValue({
          field: "coverage_start_date",
          value: "2026-01-02T00:00:00Z",
        }),
      ).toEqual({ value: new Date("2026-01-02T00:00:00Z") });
    });

    it("reports a string that is not a date", () => {
      expect(
        coerceCatalogFieldValue({
          field: "coverage_end_date",
          value: "last spring",
        }),
      ).toEqual({
        value: undefined,
        problem: 'expected an ISO 8601 date, got "last spring"',
      });
    });
  });
});
