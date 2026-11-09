import { describe, expect, it } from "vitest";
import { gradePdfAssist, listNumbersInText } from "./gradePdfAssist";
import type { PdfAssistCase } from "./pdfAssistCases";

const CASE: PdfAssistCase = {
  id: "test",
  file: "ochaSudan",
  page: 1,
  bbox: [0, 0, 1, 1],
  required: [
    { value: 2500000, unit: "n", subject: "Darfur" },
    { value: 15.7, unit: "percent" },
  ],
  optional: [0.001],
  note: "",
};

const TEXT =
  "In Darfur, 2.5 million people got water in 2024 (12). Deaths fell by 15.7% (p < 0.001). Rates were 64 � 5% overall.";

function _row(subject: string, value: number, unit = "n") {
  return { subject, metric: "m", value, unit };
}

describe("listNumbersInText", () => {
  it("reads scale words, years, and decimals the PDF shows as an unknown character", () => {
    const numbers = listNumbersInText(TEXT);

    expect(numbers).toEqual(
      expect.arrayContaining([2.5, 2500000, 2024, 12, 15.7, 0.001, 64.5]),
    );
  });
});

describe("listNumbersInText formats", () => {
  it("reads a typographic minus and keeps short comma lists apart", () => {
    const numbers = listNumbersInText(
      "Mortality \u2212 0.126 and \u22120.131; modules 2,3, or 4; 21,563 cases",
    );

    expect(numbers).toEqual(
      expect.arrayContaining([-0.126, -0.131, 2, 3, 4, 21563]),
    );
    expect(numbers).not.toContain(23);
  });
});

describe("gradePdfAssist", () => {
  it("counts required figures found by rules or the model, and sorts the model's rows", () => {
    const grade = gradePdfAssist({
      testCase: CASE,
      regionText: TEXT,
      ruleRows: [_row("", 15.7, "percent")],
      modelRows: [
        _row("Darfur", 2500000),
        _row("", 15.7, "percent"),
        _row("", 0.001),
        _row("", 2024),
        _row("", 999),
      ],
    });

    expect(grade).toMatchObject({
      requiredFound: 2,
      requiredTotal: 2,
      subjectMisses: 0,
      useful: 1,
      duplicates: 1,
      fair: 1,
      spurious: 1,
      fabricated: 1,
    });
  });

  it("does not count a required value with the wrong unit as found", () => {
    const grade = gradePdfAssist({
      testCase: CASE,
      regionText: TEXT,
      ruleRows: [],
      modelRows: [_row("Darfur", 2500000), _row("", 15.7, "n")],
    });

    expect(grade.requiredFound).toBe(1);
    expect(grade.unitErrors).toBe(1);
  });

  it("flags a model row whose subject misses the one the text gives", () => {
    const grade = gradePdfAssist({
      testCase: CASE,
      regionText: TEXT,
      ruleRows: [],
      modelRows: [_row("Sudan", 2500000)],
    });

    expect(grade.subjectMisses).toBe(1);
  });
});
