import { COVID_QUESTIONS } from "./covid/covidQuestions";
import { FIT_REGRESSION_QUESTIONS } from "./covid/fitRegressionQuestions";
import type { EvalQuestion } from "./EvalQuestion";

/** `--questions R` runs the fitRegression questions, outside the default 45. */
const FIT_REGRESSION_SELECTOR = "R";

/**
 * The questions a `--questions` value selects. With no value it is the
 * audit's 45 questions, so archived runs compare. A one-letter selector
 * picks a category: `P` page questions, `M` mention questions, `S` schema
 * questions, `F` follow-ups, `R` the fitRegression questions. A full id such
 * as `B01` picks one question.
 */
export function selectEvalQuestions(ids: string): readonly EvalQuestion[] {
  if (!ids) {
    return COVID_QUESTIONS.filter((question) => {
      return (
        question.category !== "page_context" &&
        question.category !== "mentions" &&
        question.category !== "schema"
      );
    });
  }
  const tokens = ids.split(",");
  const wanted = new Set(
    tokens.filter((token) => {
      return token !== FIT_REGRESSION_SELECTOR;
    }),
  );
  const covidQuestions = COVID_QUESTIONS.filter((question) => {
    return (
      wanted.has(question.id) ||
      [...wanted].some((id) => {
        return question.id.startsWith(id) && id.length === 1;
      })
    );
  });
  const fitQuestions = tokens.includes(FIT_REGRESSION_SELECTOR)
    ? FIT_REGRESSION_QUESTIONS
    : [];
  return [...covidQuestions, ...fitQuestions];
}
