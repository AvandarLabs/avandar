import { isValidDateValue } from "@utils/guards/isValidDateValue/isValidDateValue.ts";
import { describe, expect, it } from "vitest";

describe("isValidDateValue", () => {
  describe("valid strings", () => {
    it("accepts ISO 8601 UTC and offset forms", () => {
      expect(isValidDateValue("2024-01-21T05:00:00Z")).toBe(true);
      expect(isValidDateValue("2024-01-21T05:00:00.000Z")).toBe(true);
      expect(isValidDateValue("2024-01-21T05:00:00-05:00")).toBe(true);
    });

    it("accepts date-only ISO strings", () => {
      expect(isValidDateValue("2024-06-15")).toBe(true);
    });

    it("accepts common slash date strings engines parse", () => {
      expect(isValidDateValue("2024/01/21")).toBe(true);
    });
  });

  describe("invalid strings", () => {
    it("rejects non-date text", () => {
      expect(isValidDateValue("not-a-date")).toBe(false);
      expect(isValidDateValue("Invalid Date")).toBe(false);
    });

    it("rejects empty and whitespace-only strings", () => {
      expect(isValidDateValue("")).toBe(false);
      expect(isValidDateValue("   ")).toBe(false);
    });
  });

  describe("valid numbers", () => {
    it("accepts epoch milliseconds in range", () => {
      expect(isValidDateValue(0)).toBe(true);
      expect(isValidDateValue(-0)).toBe(true);
      expect(isValidDateValue(1_705_813_200_000)).toBe(true);
      expect(isValidDateValue(-86_400_000)).toBe(true);
    });

    it("accepts milliseconds at the ECMAScript time-value boundary", () => {
      expect(isValidDateValue(8.64e15)).toBe(true);
      expect(isValidDateValue(-8.64e15)).toBe(true);
    });
  });

  describe("invalid numbers", () => {
    it("rejects NaN and non-finite values", () => {
      expect(isValidDateValue(Number.NaN)).toBe(false);
      expect(isValidDateValue(Number.POSITIVE_INFINITY)).toBe(false);
      expect(isValidDateValue(Number.NEGATIVE_INFINITY)).toBe(false);
    });

    it("rejects finite numbers outside representable time range", () => {
      expect(isValidDateValue(8.64e15 + 1)).toBe(false);
      expect(isValidDateValue(1e20)).toBe(false);
      expect(isValidDateValue(Number.MAX_VALUE)).toBe(false);
    });
  });

  describe("Date instances", () => {
    it("accepts valid Date instances", () => {
      expect(isValidDateValue(new Date())).toBe(true);
      expect(isValidDateValue(new Date(0))).toBe(true);
      expect(isValidDateValue(new Date("2024-01-01"))).toBe(true);
    });

    it("rejects Invalid Date", () => {
      expect(isValidDateValue(new Date(Number.NaN))).toBe(false);
      expect(isValidDateValue(new Date("not-a-date"))).toBe(false);
    });
  });

  describe("non-string, non-number types", () => {
    it("rejects null and undefined", () => {
      expect(isValidDateValue(null)).toBe(false);
      expect(isValidDateValue(undefined)).toBe(false);
    });

    it("rejects booleans", () => {
      expect(isValidDateValue(true)).toBe(false);
      expect(isValidDateValue(false)).toBe(false);
    });

    it("rejects plain objects and arrays", () => {
      expect(isValidDateValue({})).toBe(false);
      expect(
        isValidDateValue({
          valueOf: () => {
            return 0;
          },
        }),
      ).toBe(false);
      expect(isValidDateValue([])).toBe(false);
      expect(isValidDateValue([2024, 0, 1])).toBe(false);
    });

    it("rejects bigint and symbol", () => {
      expect(isValidDateValue(0n)).toBe(false);
      expect(isValidDateValue(Symbol("x"))).toBe(false);
    });
  });
});
