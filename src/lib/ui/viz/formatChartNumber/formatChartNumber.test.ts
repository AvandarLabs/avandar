import { describe, expect, it } from "vitest";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";

describe("formatChartNumber", () => {
  describe("non-compact (tooltip / cell)", () => {
    it("shows 3 significant figures for |x| < 1", () => {
      expect(formatChartNumber(0.00123)).toBe("0.00123");
      expect(formatChartNumber(0.5)).toBe("0.500");
      expect(formatChartNumber(0.0042)).toBe("0.00420");
      expect(formatChartNumber(-0.00123)).toBe("-0.00123");
    });

    it("shows 2 decimals for 1 <= |x| < 1M", () => {
      expect(formatChartNumber(1)).toBe("1.00");
      expect(formatChartNumber(42.5)).toBe("42.50");
      expect(formatChartNumber(1234)).toBe("1,234.00");
      expect(formatChartNumber(999_999.99)).toBe("999,999.99");
    });

    it("shows 0 decimals for |x| >= 1M", () => {
      expect(formatChartNumber(1_000_000)).toBe("1,000,000");
      expect(formatChartNumber(1_234_567.89)).toBe("1,234,568");
      expect(formatChartNumber(1_500_000_000)).toBe("1,500,000,000");
    });

    it("handles zero", () => {
      expect(formatChartNumber(0)).toBe("0");
    });

    it("handles non-finite and non-numeric values", () => {
      expect(formatChartNumber(NaN)).toBe("");
      expect(formatChartNumber(Infinity)).toBe("");
      expect(formatChartNumber(null)).toBe("");
      expect(formatChartNumber(undefined)).toBe("");
      expect(formatChartNumber("hello")).toBe("hello");
    });
  });

  describe("compact (axis tick)", () => {
    it("uses raw format below 1000", () => {
      expect(formatChartNumber(0.00123, { compact: true })).toBe("0.00123");
      expect(formatChartNumber(42.5, { compact: true })).toBe("42.50");
      expect(formatChartNumber(999, { compact: true })).toBe("999.00");
    });

    it("uses K/M/B for values >= 1000", () => {
      expect(formatChartNumber(1500, { compact: true })).toBe("1.5K");
      expect(formatChartNumber(2_300_000, { compact: true })).toBe("2.3M");
      expect(formatChartNumber(1_500_000_000, { compact: true })).toBe("1.5B");
    });
  });
});
