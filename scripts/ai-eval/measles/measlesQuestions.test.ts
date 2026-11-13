import { describe, expect, it } from "vitest";
import { gradeNoLabelAnswer, MEASLES_QUESTIONS } from "./measlesQuestions";
import type { EvalQueryResult } from "../runtime/EvalDatabase";

function _createResult(
  columnNames: readonly string[],
  rows: ReadonlyArray<readonly unknown[]>,
): EvalQueryResult {
  return {
    columns: columnNames.map((name) => {
      return { name, type: "BIGINT" };
    }),
    rows,
  };
}

/** Grades a result for a question whose truth count is `truthCount`. */
function _gradeCount(
  questionId: string,
  truthCount: number,
  result: EvalQueryResult,
): boolean {
  const question = MEASLES_QUESTIONS.find((candidate) => {
    return candidate.id === questionId;
  });
  return question!.grade({
    result,
    truth: { count: _createResult(["count_star()"], [[truthCount]]) },
  }).pass;
}

describe("gradeNoLabelAnswer", () => {
  it("passes a reply that says the code has no label", () => {
    expect(
      gradeNoLabelAnswer("Code 9 has no label yet in the dictionary.").pass,
    ).toBe(true);
  });

  it("fails a reply that invents a meaning", () => {
    expect(gradeNoLabelAnswer("9 means Unknown.").pass).toBe(false);
  });

  it("fails a reply that invents 'not recorded' as the meaning", () => {
    expect(gradeNoLabelAnswer("9 means sex was not recorded.").pass).toBe(
      false,
    );
  });
});

describe("the coded-column count graders", () => {
  it("pass a single count", () => {
    expect(_gradeCount("D01", 1, _createResult(["cases"], [[1]]))).toBe(true);
  });

  it("pass a single count beside a text label", () => {
    expect(
      _gradeCount(
        "D02",
        11,
        _createResult(["gender", "cases"], [["Male", 11]]),
      ),
    ).toBe(true);
  });

  it("fail a wrong count whose code column holds the truth value", () => {
    // D01's truth (1) is also the Male code: GENDER 1 with 7 cases.
    expect(
      _gradeCount("D01", 1, _createResult(["GENDER", "cases"], [[1, 7]])),
    ).toBe(false);
  });

  it("fail a grouped result whose codes include the truth value", () => {
    // D03's truth (3) is also the Upper-middle code.
    expect(
      _gradeCount(
        "D03",
        3,
        _createResult(
          ["ses_cat", "cases"],
          [
            [3, 5],
            [4, 2],
          ],
        ),
      ),
    ).toBe(false);
  });

  it("fail a wrong single count", () => {
    expect(_gradeCount("D02", 11, _createResult(["cases"], [[12]]))).toBe(
      false,
    );
  });
});
