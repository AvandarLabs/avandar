import type { PdfAssistResult } from "./runPdfAssistEval";

/** A whole run's totals. */
export type PdfAssistRunSummary = {
  label: string;
  answers: number;
  requiredFound: number;
  requiredTotal: number;
  /** Required figures found, out of all required, rules and model together. */
  recall: number;
  useful: number;
  duplicates: number;
  fair: number;
  spurious: number;
  fabricated: number;
  /** Model rows holding a whole number from 1900 to 2100: likely a year. */
  yearLike: number;
  subjectMisses: number;
  unitErrors: number;
  /** Replies with no readable rows although the region had figures to add. */
  emptyReplies: number;
  errors: number;
  costPerRegion: number;
  latencyMedianMs: number;
};

function _sum(
  results: readonly PdfAssistResult[],
  pick: (result: PdfAssistResult) => number,
): number {
  return results.reduce((total, result) => {
    return total + pick(result);
  }, 0);
}

function _median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => {
    return left - right;
  });
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Adds up a run's graded regions. */
export function summarizePdfAssistRun(
  label: string,
  results: readonly PdfAssistResult[],
): PdfAssistRunSummary {
  const requiredFound = _sum(results, (result) => {
    return result.grade.requiredFound;
  });
  const requiredTotal = _sum(results, (result) => {
    return result.grade.requiredTotal;
  });
  return {
    label,
    answers: results.length,
    requiredFound,
    requiredTotal,
    recall: requiredTotal === 0 ? 1 : requiredFound / requiredTotal,
    useful: _sum(results, (result) => {
      return result.grade.useful;
    }),
    duplicates: _sum(results, (result) => {
      return result.grade.duplicates;
    }),
    fair: _sum(results, (result) => {
      return result.grade.fair;
    }),
    spurious: _sum(results, (result) => {
      return result.grade.spurious;
    }),
    fabricated: _sum(results, (result) => {
      return result.grade.fabricated;
    }),
    yearLike: _sum(results, (result) => {
      return result.modelRows.filter((row) => {
        return (
          Number.isInteger(row.value) && row.value >= 1900 && row.value <= 2100
        );
      }).length;
    }),
    subjectMisses: _sum(results, (result) => {
      return result.grade.subjectMisses;
    }),
    unitErrors: _sum(results, (result) => {
      return result.grade.unitErrors;
    }),
    emptyReplies: results.filter((result) => {
      return (
        result.modelRows.length === 0 &&
        result.grade.requiredFound < result.grade.requiredTotal
      );
    }).length,
    errors: results.filter((result) => {
      return result.error;
    }).length,
    costPerRegion:
      _sum(results, (result) => {
        return result.cost;
      }) / Math.max(1, results.length),
    latencyMedianMs: _median(
      results.map((result) => {
        return result.latencyMs;
      }),
    ),
  };
}
