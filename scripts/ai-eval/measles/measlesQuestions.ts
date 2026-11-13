import { ResultChecks } from "../grading/ResultChecks";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

/** The one count a truth query returns. */
function _count(context: GradeContext): number {
  return Number(context.truth.count?.rows[0]?.[0] ?? Number.NaN);
}

function _hasCount(context: GradeContext): Verdict {
  return ResultChecks.hasValue(context.result, _count(context), { maxRows: 1 });
}

/**
 * Grades a reply about a code with no label. It passes when the reply says
 * the code has no label, so a model that invents a meaning fails.
 */
export function gradeNoLabelAnswer(text: string): Verdict {
  const saysNoLabel =
    /no label|not labell?ed|unlabell?ed|doesn't have a label|does not have a label|hasn't been labell?ed|has not been labell?ed|not recorded/i.test(
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
