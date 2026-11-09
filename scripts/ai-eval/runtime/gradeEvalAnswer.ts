import type { EvalQuestion } from "../EvalQuestion";
import type { EvalAnswer } from "../harnesses/EvalHarness";
import type { EvalQueryResult } from "./EvalDatabase";

/** One graded question, as written to `results.jsonl`. */
export type GradedAnswer = {
  id: string;
  category: EvalQuestion["category"];
  prompt: string;
  pass: boolean;
  detail: string;
  /** Cards the user saw (automatic lookups are not counted). */
  questionsAsked: number;
  /** Asked although the question needed no clarification. */
  isNeedlessQuestion: boolean;
  /** Answered without asking although the question needed one. */
  isMissedQuestion: boolean;
  answer: Omit<EvalAnswer, "result"> & {
    resultColumns?: string[];
    resultRowCount?: number;
    resultPreview?: ReadonlyArray<readonly unknown[]>;
  };
};

/** Words an answer uses to say it cannot see what was asked about. */
const CANNOT_SEE_PATTERN =
  /\b(can(?:no|['’])t|can not|unable|not able|no access|don['’]t have access|do not have access)\b/i;

/**
 * A question whose right answer runs no query: pass when the assistant ran
 * none and says it cannot see the gadget.
 */
function _gradeNoQuery(answer: EvalAnswer): {
  pass: boolean;
  detail: string;
} {
  if (answer.finalSql !== undefined || answer.result) {
    return { pass: false, detail: "ran a query it should not have run" };
  }
  return CANNOT_SEE_PATTERN.test(answer.assistantText)
    ? { pass: true, detail: "ran no query and said it cannot see it" }
    : { pass: false, detail: "ran no query but did not say it cannot see it" };
}

function _gradeResult(
  question: EvalQuestion,
  answer: EvalAnswer,
  truth: Readonly<Record<string, EvalQueryResult>>,
): { pass: boolean; detail: string } {
  if (question.expectsNoQuery) {
    return _gradeNoQuery(answer);
  }
  if (!answer.result) {
    return { pass: false, detail: answer.error ?? "no result" };
  }
  if (
    question.expectsChart &&
    (!answer.vizType || answer.vizType === "table")
  ) {
    return { pass: false, detail: "asked for a chart, got a table" };
  }
  try {
    return question.grade({ result: answer.result, truth });
  } catch (error) {
    return {
      pass: false,
      detail: `grader error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Grades one answer against the question's ground truth and policy. */
export function gradeEvalAnswer(
  question: EvalQuestion,
  answer: EvalAnswer,
  truth: Readonly<Record<string, EvalQueryResult>>,
): GradedAnswer {
  const verdict = _gradeResult(question, answer, truth);
  const questionsAsked = answer.clarifications.filter((clarification) => {
    return !clarification.isAutomatic;
  }).length;
  const { result, ...answerWithoutResult } = answer;
  return {
    id: question.id,
    category: question.category,
    prompt: question.prompt,
    pass: verdict.pass,
    detail: verdict.detail,
    questionsAsked,
    isNeedlessQuestion:
      question.clarification === "not_needed" && questionsAsked > 0,
    isMissedQuestion:
      question.clarification === "expected" && questionsAsked === 0,
    answer: {
      ...answerWithoutResult,
      resultColumns: result?.columns.map((column) => {
        return column.name;
      }),
      resultRowCount: result?.rows.length,
      resultPreview: result?.rows.slice(0, 5),
    },
  };
}
