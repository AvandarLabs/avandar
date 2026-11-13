import { describe, expect, it } from "vitest";
import { gradeNoLabelAnswer } from "./measlesQuestions";

describe("gradeNoLabelAnswer", () => {
  it("passes a reply that says the code has no label", () => {
    expect(
      gradeNoLabelAnswer("Code 9 has no label yet in the dictionary.").pass,
    ).toBe(true);
  });

  it("fails a reply that invents a meaning", () => {
    expect(gradeNoLabelAnswer("9 means Unknown.").pass).toBe(false);
  });
});
