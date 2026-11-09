import type { ExpectedFigure, PdfAssistCase } from "./pdfAssistCases";
import type { ExtractedTable } from "@/workers/pdfSniff/pdfSniff.types";

/** One extracted figure, from the rules or the model. */
export type ExtractedFigure = {
  subject: string;
  metric: string;
  value: number;
  unit: string;
};

/** How one region's answer did. */
export type PdfAssistGrade = {
  /** Required figures present in the final table (rules or model). */
  requiredFound: number;
  requiredTotal: number;
  /** Required values the model gave with the wrong unit. */
  unitErrors: number;
  /** Required figures the model found under a different subject. */
  subjectMisses: number;
  /** Model rows that add a required figure the rules missed. */
  useful: number;
  /** Model rows repeating a figure the rules already had. */
  duplicates: number;
  /** Model rows on the case's optional list. */
  fair: number;
  /** Model rows reading a number in the text that is not a measurement. */
  spurious: number;
  /** Model rows whose number is nowhere in the text. */
  fabricated: number;
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  twenty: 20,
  hundred: 100,
};

const SCALES: Record<string, number> = {
  thousand: 1e3,
  million: 1e6,
  billion: 1e9,
};

function _isSame(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-6);
}

/**
 * Every number a reader could take from the text: digits (with thousands
 * separators and a hyphen or typographic minus), scale words (2.5 million),
 * number words, and
 * decimals whose point the PDF's text layer lost to an unknown character
 * ("64 � 5" is 64.5).
 */
export function listNumbersInText(text: string): number[] {
  const numbers: number[] = [];
  // A sign may be a hyphen or a typographic minus, set apart by a space.
  // Commas separate thousands only before exactly three digits, so "2,3"
  // is two numbers.
  const pattern =
    /(?:([-\u2212])\s?)?(\d{1,3}(?:,\d{3})+(?!\d)|\d+)(\.\d+)?(?:\s*\uFFFD\s*(\d+))?(?:\s+(thousand|million|billion))?/giu;
  for (const match of text.matchAll(pattern)) {
    const sign = match[1] ? -1 : 1;
    const whole = Number(`${match[2]!.replaceAll(",", "")}${match[3] ?? ""}`);
    const value = match[4] ? Number(`${whole}.${match[4]}`) : whole;
    numbers.push(whole, value, sign * whole, sign * value);
    const scale = match[5] ? SCALES[match[5].toLowerCase()] : undefined;
    if (scale) {
      numbers.push(value * scale);
    }
  }
  for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    const value = WORD_NUMBERS[word];
    if (value !== undefined) {
      numbers.push(value);
    }
  }
  return numbers;
}

function _matches(figure: ExtractedFigure, expected: ExpectedFigure): boolean {
  return _isSame(figure.value, expected.value) && figure.unit === expected.unit;
}

function _isSubjectRight(
  figure: ExtractedFigure,
  expected: ExpectedFigure,
): boolean {
  return (
    !expected.subject ||
    figure.subject.toLowerCase().includes(expected.subject.toLowerCase())
  );
}

type GradeInput = Readonly<{
  testCase: PdfAssistCase;
  regionText: string;
  ruleRows: readonly ExtractedFigure[];
  modelRows: readonly ExtractedFigure[];
}>;

function _gradeRequired(input: GradeInput) {
  const allRows = [...input.ruleRows, ...input.modelRows];
  let requiredFound = 0;
  let unitErrors = 0;
  let subjectMisses = 0;
  for (const expected of input.testCase.required) {
    if (
      allRows.some((row) => {
        return _matches(row, expected);
      })
    ) {
      requiredFound += 1;
    } else if (
      input.modelRows.some((row) => {
        return _isSame(row.value, expected.value);
      })
    ) {
      unitErrors += 1;
    }
    const modelMatch = input.modelRows.find((row) => {
      return _matches(row, expected);
    });
    const ruleMatch = input.ruleRows.some((row) => {
      return _matches(row, expected);
    });
    if (modelMatch && !ruleMatch && !_isSubjectRight(modelMatch, expected)) {
      subjectMisses += 1;
    }
  }
  return { requiredFound, unitErrors, subjectMisses };
}

type RowKind = "useful" | "duplicates" | "fair" | "spurious" | "fabricated";

function _classifyModelRow(
  row: ExtractedFigure,
  input: GradeInput,
  textNumbers: readonly number[],
): RowKind {
  const required = input.testCase.required.some((expected) => {
    return _isSame(row.value, expected.value);
  });
  if (required) {
    const ruleHad = input.ruleRows.some((rule) => {
      return _isSame(rule.value, row.value);
    });
    return ruleHad ? "duplicates" : "useful";
  }
  if (
    input.testCase.optional.some((value) => {
      return _isSame(row.value, value);
    })
  ) {
    return "fair";
  }
  return textNumbers.some((value) => {
    return _isSame(row.value, value);
  })
    ? "spurious"
    : "fabricated";
}

/**
 * Grades the final table for one region: which required figures it holds,
 * and what each of the model's rows added. A fabricated row (a number that
 * is nowhere in the text) is the one result that must never happen.
 */
export function gradePdfAssist(input: GradeInput): PdfAssistGrade {
  const textNumbers = listNumbersInText(input.regionText);
  const counts: Record<RowKind, number> = {
    useful: 0,
    duplicates: 0,
    fair: 0,
    spurious: 0,
    fabricated: 0,
  };
  for (const row of input.modelRows) {
    counts[_classifyModelRow(row, input, textNumbers)] += 1;
  }
  return {
    ..._gradeRequired(input),
    requiredTotal: input.testCase.required.length,
    ...counts,
  };
}

/** The rows of a rule or model table, as figures. */
export function tableToFigures(table: ExtractedTable): ExtractedFigure[] {
  return table.cells.slice(table.headerRows).flatMap((row) => {
    const value = Number(row[2]);
    return Number.isFinite(value)
      ? [
          {
            subject: row[0] ?? "",
            metric: row[1] ?? "",
            value,
            unit: row[3] ?? "",
          },
        ]
      : [];
  });
}
