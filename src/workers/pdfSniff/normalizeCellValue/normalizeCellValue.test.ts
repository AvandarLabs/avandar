import { describe, expect, it } from "vitest";
import { normalizeCellValue } from "./normalizeCellValue";

describe("normalizeCellValue", () => {
  describe("values it must leave alone", () => {
    it("passes plain text through untouched", () => {
      expect(normalizeCellValue("Mopti")).toBe("Mopti");
      expect(normalizeCellValue("Health facility")).toBe("Health facility");
    });

    it("passes a plain number through untouched", () => {
      expect(normalizeCellValue("1204")).toBe("1204");
      expect(normalizeCellValue("45.3")).toBe("45.3");
    });

    it("does not read count-and-percent as a negative number", () => {
      // From plos-one-ncd-mobile-phone-surveys.pdf: "361 (84.7)" means 361
      // respondents, 84.7 percent. Accounting-style cleanup would turn the
      // parenthesised part into -84.7 and produce a number that appears
      // nowhere in the document.
      expect(normalizeCellValue("361 (84.7)")).toBe("361 (84.7)");
      expect(normalizeCellValue("6 (1.4)")).toBe("6 (1.4)");
    });

    it("does not invent a number from a footnote-only cell", () => {
      expect(normalizeCellValue("*")).toBe("*");
      expect(normalizeCellValue("†")).toBe("†");
    });
  });

  describe("accounting negatives", () => {
    it("converts parentheses wrapping the whole value to a minus sign", () => {
      expect(normalizeCellValue("(1,234)")).toBe("-1234");
      expect(normalizeCellValue("(0.5)")).toBe("-0.5");
      expect(normalizeCellValue("($1,234.56)")).toBe("-1234.56");
    });
  });

  describe("sign characters", () => {
    it("converts a Unicode minus to an ASCII hyphen", () => {
      // From frontiers-peru-child-health-insurance.pdf, which writes
      // negatives with U+2212 rather than U+002D.
      expect(normalizeCellValue("−0.126")).toBe("-0.126");
      expect(normalizeCellValue("−1,450")).toBe("-1450");
    });
  });

  describe("currency, separators, and percent", () => {
    it("strips currency symbols", () => {
      expect(normalizeCellValue("$1234")).toBe("1234");
      expect(normalizeCellValue("€45.30")).toBe("45.30");
      expect(normalizeCellValue("£12")).toBe("12");
    });

    it("strips thousands separators", () => {
      expect(normalizeCellValue("1,234,567")).toBe("1234567");
      expect(normalizeCellValue("1,234.56")).toBe("1234.56");
    });

    it("strips a percent sign without rescaling the number", () => {
      // 12% becomes 12, never 0.12. Rescaling would make our table disagree
      // with the document a reader is holding next to it.
      expect(normalizeCellValue("12%")).toBe("12");
      expect(normalizeCellValue("84.7 %")).toBe("84.7");
    });

    it("does not strip a comma that is acting as a decimal point", () => {
      // "1,5" is ambiguous, but three digits after a comma is the giveaway
      // for a thousands separator, and anything else is left alone rather
      // than guessed at.
      expect(normalizeCellValue("1,5")).toBe("1,5");
      expect(normalizeCellValue("1,50")).toBe("1,50");
    });
  });

  describe("footnote markers", () => {
    it("strips a trailing marker from a number", () => {
      expect(normalizeCellValue("45.3*")).toBe("45.3");
      expect(normalizeCellValue("45.3†")).toBe("45.3");
      expect(normalizeCellValue("1,204‡")).toBe("1204");
    });

    it("strips a trailing superscript digit from a number", () => {
      expect(normalizeCellValue("45.3¹")).toBe("45.3");
    });

    it("leaves a trailing marker on text alone", () => {
      // "Gao*" is a place name with a footnote, not a number.
      expect(normalizeCellValue("Gao*")).toBe("Gao*");
    });
  });

  describe("null tokens", () => {
    it("treats dash-family placeholders as empty", () => {
      expect(normalizeCellValue("-")).toBe("");
      expect(normalizeCellValue("–")).toBe("");
      expect(normalizeCellValue("—")).toBe("");
      expect(normalizeCellValue("−")).toBe("");
    });

    it("treats not-applicable markers as empty", () => {
      expect(normalizeCellValue("n/a")).toBe("");
      expect(normalizeCellValue("N/A")).toBe("");
      expect(normalizeCellValue("NA")).toBe("");
      expect(normalizeCellValue("")).toBe("");
      expect(normalizeCellValue("   ")).toBe("");
    });
  });

  describe("whitespace", () => {
    it("collapses internal whitespace and trims", () => {
      expect(normalizeCellValue("  Health   facility  ")).toBe(
        "Health facility",
      );
    });

    it("collapses non-breaking spaces", () => {
      expect(normalizeCellValue("Health facility")).toBe("Health facility");
    });
  });
});
