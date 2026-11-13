import { describe, expect, it } from "vitest";
import {
  COUNTY,
  GENDER,
  SEX_LIST,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import {
  buildAddedPairs,
  buildBindingInputs,
  buildDraftConversion,
  buildMatchConversion,
  isConvertingPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { UnmatchedValue } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";

const UNMATCHED = new Map<string, readonly UnmatchedValue[]>([
  [
    GENDER.id,
    [
      { value: "7", valueKey: "7", rowCount: 3 },
      { value: "X", valueKey: "x", rowCount: 2 },
      { value: "U", valueKey: "u", rowCount: 1 },
    ],
  ],
]);
const RESOLUTIONS = {
  [GENDER.id]: {
    "7": { action: "empty" },
    x: { action: "map", code: "9" },
    u: { action: "add", text: " Undisclosed " },
    z: { action: "map", code: "" },
  },
} as const;

describe("applyInputs", () => {
  it("converts only a pick with a code list in convert mode", () => {
    expect(isConvertingPick(SEX_PICK)).toBe(true);
    expect(isConvertingPick({ ...SEX_PICK, mode: "reference" })).toBe(false);
    expect(isConvertingPick({ ...SEX_PICK, codeListId: undefined })).toBe(
      false,
    );
  });

  it("writes a converted column's overrides, original text first, and pins it in place", () => {
    const [binding] = buildBindingInputs({
      columns: [GENDER, COUNTY],
      picks: { [GENDER.id]: { ...SEX_PICK, keepsOriginal: true } },
      resolutions: RESOLUTIONS,
      unmatchedByColumnId: UNMATCHED,
      isPinned: true,
    });

    expect(binding).toEqual({
      datasetColumnId: GENDER.id,
      dictionaryId: SEX_PICK.dictionaryId,
      entryId: SEX_PICK.entryId,
      codeListId: SEX_LIST.id,
      mode: "convert",
      direction: "decode",
      keepsOriginal: true,
      valueOverrides: [
        { value: "7", action: "empty" },
        { value: "X", action: "map", code: "9" },
      ],
      isPinned: true,
    });
  });

  it("writes a reference column plain", () => {
    const [binding] = buildBindingInputs({
      columns: [GENDER],
      picks: { [GENDER.id]: { ...SEX_PICK, mode: "reference" } },
      resolutions: RESOLUTIONS,
      unmatchedByColumnId: UNMATCHED,
      isPinned: true,
    });

    expect(binding).toMatchObject({
      mode: "reference",
      keepsOriginal: false,
      valueOverrides: [],
      isPinned: false,
    });
  });

  it("adds a value to the list as a code with the label typed, or a label with the code typed", () => {
    expect(
      buildAddedPairs({
        picks: { [GENDER.id]: SEX_PICK },
        resolutions: RESOLUTIONS,
        unmatchedByColumnId: UNMATCHED,
      }),
    ).toEqual([{ codeListId: SEX_LIST.id, code: "U", label: "Undisclosed" }]);
    expect(
      buildAddedPairs({
        picks: { [GENDER.id]: { ...SEX_PICK, direction: "encode" } },
        resolutions: RESOLUTIONS,
        unmatchedByColumnId: UNMATCHED,
      }),
    ).toEqual([{ codeListId: SEX_LIST.id, code: "Undisclosed", label: "U" }]);
  });

  it("previews with the added pair and the overrides, matches with the list alone", () => {
    const draft = buildDraftConversion({
      column: GENDER,
      pick: { ...SEX_PICK, codeListId: SEX_LIST.id },
      codeList: SEX_LIST,
      resolutions: RESOLUTIONS[GENDER.id],
      unmatched: UNMATCHED.get(GENDER.id),
    });
    const match = buildMatchConversion({
      column: GENDER,
      pick: SEX_PICK,
      codeList: SEX_LIST,
    });

    expect(
      draft.pairs.map((pair) => {
        return pair.code;
      }),
    ).toEqual(["1", "2", "9", "U"]);
    expect(draft.overrides).toHaveLength(2);
    expect(draft.outputDataType).toBe("varchar");
    expect(match.pairs).toEqual(SEX_LIST.pairs);
    expect(match.overrides).toEqual([]);
  });
});
