import { MatcherText } from "../grading/ResultMatchers";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

/** The one count a truth query returns. */
function _getTruthCount(context: GradeContext): number {
  return Number(context.truth.count?.rows[0]?.[0] ?? Number.NaN);
}

/**
 * Passes a result that is one row with exactly one number in it, equal to
 * the truth count. A code shown beside the count, or a grouped result, fails
 * even when one of its codes equals the count.
 */
function _hasCount(context: GradeContext): Verdict {
  const truthCount = _getTruthCount(context);
  const { rows } = context.result;
  if (rows.length !== 1) {
    return { pass: false, detail: `expected 1 row, got ${rows.length}` };
  }
  const numbers = rows[0]!.flatMap((cell) => {
    const cellNumber = MatcherText.toNumber(cell);
    return cellNumber === undefined ? [] : [cellNumber];
  });
  if (numbers.length !== 1) {
    return {
      pass: false,
      detail: `expected 1 number in the row, got ${numbers.length}`,
    };
  }
  return numbers[0] === truthCount
    ? { pass: true, detail: `found ${truthCount}` }
    : { pass: false, detail: `got ${numbers[0]}, expected ${truthCount}` };
}

/**
 * Grades a reply about a code with no label. It passes when the reply says
 * the code has no label, so a model that invents a meaning fails.
 */
export function gradeNoLabelAnswer(text: string): Verdict {
  const saysNoLabel =
    /no label|not labell?ed|unlabell?ed|doesn't have a label|does not have a label|hasn't been labell?ed|has not been labell?ed/i.test(
      text,
    );
  return saysNoLabel
    ? { pass: true, detail: "said the code has no label" }
    : { pass: false, detail: "did not say the code has no label" };
}

const NOT_A_QUERY: EvalQuestion["grade"] = () => {
  return { pass: false, detail: "graded a prose answer as a query result" };
};

/**
 * Questions about coded columns, asked in labels, over the measles line
 * list. Run with `--workspace measles`.
 */
export const MEASLES_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "D01",
    category: "coded",
    prompt: "How many female cases were hospitalized?",
    clarification: "not_needed",
    truth: {
      count: `SELECT count(*) FROM line_list WHERE "GENDER" = 2 AND "hosp_yn" = 'Y'`,
    },
    grade: _hasCount,
  },
  {
    id: "D02",
    category: "coded",
    prompt: "How many male cases were there?",
    clarification: "not_needed",
    truth: { count: `SELECT count(*) FROM line_list WHERE "GENDER" = 1` },
    grade: _hasCount,
  },
  {
    id: "D03",
    category: "coded",
    prompt: "How many cases had a high socioeconomic status?",
    clarification: "not_needed",
    truth: { count: `SELECT count(*) FROM line_list WHERE "ses_cat" = 4` },
    grade: _hasCount,
  },
  {
    id: "D04",
    category: "coded",
    prompt: "What does a GENDER value of 9 mean in the line list?",
    clarification: "not_needed",
    truth: {},
    gradeText: gradeNoLabelAnswer,
    grade: NOT_A_QUERY,
  },
];
