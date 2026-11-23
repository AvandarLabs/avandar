import type { EvalQuestion } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

/**
 * Column names that look alike across the US and global deaths datasets
 * and are not the same string.
 */
const NEAR_MATCH_PAIRS = [
  ["country_region", "country/region"],
  ["province_state", "province/state"],
] as const;

/** Columns the US deaths dataset has and the global deaths dataset does not. */
const US_ONLY_COLUMNS = ["admin2", "population", "fips", "combined_key"];

/** Whether the reply names both sides of a column that only looks shared. */
function _namesNearMatch(folded: string): boolean {
  const namesPair = NEAR_MATCH_PAIRS.some(([left, right]) => {
    return folded.includes(left) && folded.includes(right);
  });
  return namesPair || (/long_/.test(folded) && /\blong\b/.test(folded));
}

/** Whether the reply says the rows cannot be stacked as stored. */
function _saysNotStackable(folded: string): boolean {
  return (
    /not (?:directly )?(?:append|stack)/.test(folded) ||
    /can(?:not|'t| not) be (?:appended|stacked)/.test(folded) ||
    /(?:aren't|are not) the same/.test(folded) ||
    /columns differ/.test(folded) ||
    /different columns/.test(folded) ||
    /rename/.test(folded)
  );
}

/**
 * Grades a prose answer about whether the US deaths dataset and the global
 * deaths dataset can be appended. The reply has to say they cannot be
 * stacked as stored and name a real difference.
 */
export function gradeSchemaComparison(text: string): Verdict {
  const folded = text.toLowerCase();
  const namesADifference =
    _namesNearMatch(folded) ||
    US_ONLY_COLUMNS.some((name) => {
      return folded.includes(name);
    });
  if (!namesADifference) {
    return {
      pass: false,
      detail: "did not name a column the two datasets do not share",
    };
  }
  if (!_saysNotStackable(folded)) {
    return {
      pass: false,
      detail: "did not say the rows cannot be stacked as they are",
    };
  }
  return { pass: true, detail: "answered the column comparison in text" };
}

const NOT_A_QUERY: EvalQuestion["grade"] = () => {
  return {
    pass: false,
    detail: "graded a schema answer as a query result",
  };
};

/** Questions the schema listing answers, with no explorer query. */
export const SCHEMA_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "S01",
    category: "schema",
    prompt:
      "Look at long-us-deaths.csv and long-global-deaths.csv. Are they appendable? Do they have the same or similar columns?",
    clarification: "not_needed",
    truth: {},
    gradeText: gradeSchemaComparison,
    grade: NOT_A_QUERY,
  },
  {
    id: "S02",
    category: "schema",
    prompt: "Try again",
    followsId: "S01",
    clarification: "not_needed",
    truth: {},
    gradeText: gradeSchemaComparison,
    grade: NOT_A_QUERY,
  },
];
