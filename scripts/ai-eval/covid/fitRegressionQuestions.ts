import { datasetOf } from "./covidQuestionHelpers";
import type { EvalQuestion } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

const COLUMN_NAMES = ["x", "y"] as const;

/** Five points on the exact line `y = 2x + 1`. */
const LINE_ROWS = [1, 2, 3, 4, 5].map((x) => {
  return { x, y: 2 * x + 1 };
});

/**
 * Questions that call the `fitRegression` plugin tool on the Data Explorer's
 * result. They are not in `COVID_QUESTIONS`, so the default 45 stay as they
 * are. Run them with `--questions F`.
 */
export const FIT_REGRESSION_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "F01",
    category: "page_context",
    prompt: "Fit y on x for the result on screen.",
    clarification: "not_needed",
    pageContext: {
      app: "data-explorer",
      dataset: datasetOf("long-us-deaths.csv"),
      explorer: {
        resultColumns: COLUMN_NAMES.map((name) => {
          return { name, dataType: "double" };
        }),
      },
    },
    truth: {},
    fitRegression: {
      rows: LINE_ROWS,
      columns: COLUMN_NAMES,
      xColumn: "x",
      yColumn: "y",
      slope: 2,
    },
    grade: (): Verdict => {
      return { pass: false, detail: "graded by the fitRegression call" };
    },
  },
];
