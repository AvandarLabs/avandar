import { describe, expect, it } from "vitest";
import { selectEvalQuestions } from "./selectEvalQuestions";

function _ids(selector: string): string[] {
  return selectEvalQuestions(selector).map((question) => {
    return question.id;
  });
}

describe("selectEvalQuestions", () => {
  it("keeps F selecting the follow-up questions", () => {
    expect(_ids("F")).toEqual(["F01", "F02", "F03"]);
  });

  it("runs only the fit question for R", () => {
    expect(_ids("R")).toEqual(["R01"]);
  });

  it("combines R with other selectors without a duplicate id", () => {
    const ids = _ids("F,R");

    expect(ids).toEqual(["F01", "F02", "F03", "R01"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves the fit question out of the default run", () => {
    const ids = _ids("");

    expect(ids).toHaveLength(45);
    expect(ids).not.toContain("R01");
  });
});
