import { describe, expect, it } from "vitest";
import {
  acceptCodeList,
  applyLabelSuggestions,
  getCodeListStatus,
  getUnlabeledValues,
  getValueLabel,
  setValueLabel,
  withDefaultLabels,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { DictionaryProposalCodeList } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

function _list(
  key: string,
  codes: readonly string[],
): DictionaryProposalCodeList {
  return {
    key,
    name: `${key} (${codes.join("/")})`,
    isOrdered: false,
    entryKeys: [`entry:${key}`],
    values: codes.map((value) => {
      return { value, rowCount: 10 };
    }),
  };
}

const OUTCOME = _list("outcome", ["1", "Recovered", "Unknown"]);
const SEX = _list("sex", ["1", "2"]);

describe("proposalLabelHelpers", () => {
  it("labels values that already read as labels, and marks missing words", () => {
    const labels = withDefaultLabels({}, [OUTCOME]);
    expect(
      getValueLabel(labels, { codeListKey: "outcome", code: "1" })?.label,
    ).toBe("");
    expect(
      getValueLabel(labels, { codeListKey: "outcome", code: "Recovered" }),
    ).toEqual({ label: "Recovered", isMissing: false, source: "data" });
    expect(
      getValueLabel(labels, { codeListKey: "outcome", code: "Unknown" })
        ?.isMissing,
    ).toBe(true);
  });

  it("keeps typed labels when the code lists are worked out again", () => {
    const typed = setValueLabel(withDefaultLabels({}, [SEX]), {
      codeListKey: "sex",
      code: "1",
      label: "Male",
    });
    const again = withDefaultLabels(typed, [SEX]);
    expect(getValueLabel(again, { codeListKey: "sex", code: "1" })).toEqual({
      label: "Male",
      isMissing: false,
      source: "typed",
    });
  });

  it("fills suggestions in, but never over a typed label or for an unknown value", () => {
    const typed = setValueLabel(withDefaultLabels({}, [SEX]), {
      codeListKey: "sex",
      code: "1",
      label: "Man",
    });
    const suggested = applyLabelSuggestions(typed, {
      codeListKey: "sex",
      suggestions: {
        labels: [
          { value: "1", label: "Male", isMissing: false },
          { value: "2", label: "Female", isMissing: false },
          { value: "7", label: "Other", isMissing: false },
        ],
        description: "",
      },
    });
    expect(
      getValueLabel(suggested, { codeListKey: "sex", code: "1" })?.label,
    ).toBe("Man");
    expect(getValueLabel(suggested, { codeListKey: "sex", code: "2" })).toEqual(
      {
        label: "Female",
        isMissing: false,
        source: "suggested",
      },
    );
    expect(suggested.sex?.values["7"]).toBeUndefined();
  });

  it("moves a list from To do to Suggested to Labeled", () => {
    const empty = withDefaultLabels({}, [SEX]);
    const suggested = applyLabelSuggestions(empty, {
      codeListKey: "sex",
      suggestions: {
        labels: [
          { value: "1", label: "Male", isMissing: false },
          { value: "2", label: "Female", isMissing: false },
        ],
        description: "",
      },
    });
    expect(getCodeListStatus(empty, SEX)).toBe("to_do");
    expect(getCodeListStatus(suggested, SEX)).toBe("suggested");
    expect(getCodeListStatus(acceptCodeList(suggested, "sex"), SEX)).toBe(
      "labeled",
    );
  });

  it("calls a list whose values all came with labels Labeled", () => {
    const list = _list("county", ["Bronx", "Kings"]);
    expect(getCodeListStatus(withDefaultLabels({}, [list]), list)).toBe(
      "labeled",
    );
  });

  it("counts unlabeled values and names the lists they are in", () => {
    const labels = withDefaultLabels({}, [OUTCOME, SEX]);
    expect(getUnlabeledValues(labels, [OUTCOME, SEX])).toEqual({
      valueCount: 3,
      codeListNames: ["outcome (1/Recovered/Unknown)", "sex (1/2)"],
    });
  });
});
