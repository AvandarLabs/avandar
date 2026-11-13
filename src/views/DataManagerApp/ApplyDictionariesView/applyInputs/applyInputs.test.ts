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
  findAddedCodeConflicts,
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
const CODE_LISTS = new Map([[SEX_LIST.id, SEX_LIST]]);
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
      codeLists: CODE_LISTS,
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

  it("never sends a map to a code its list does not have", () => {
    const [binding] = buildBindingInputs({
      columns: [GENDER],
      picks: { [GENDER.id]: SEX_PICK },
      resolutions: {
        [GENDER.id]: {
          x: { action: "map", code: "4" },
          u: { action: "map", code: " 9 " },
        },
      },
      unmatchedByColumnId: UNMATCHED,
      codeLists: CODE_LISTS,
      isPinned: false,
    });

    expect(binding?.valueOverrides).toEqual([
      { value: "U", action: "map", code: " 9 " },
    ]);
  });

  it("writes a reference column plain", () => {
    const [binding] = buildBindingInputs({
      columns: [GENDER],
      picks: { [GENDER.id]: { ...SEX_PICK, mode: "reference" } },
      resolutions: RESOLUTIONS,
      unmatchedByColumnId: UNMATCHED,
      codeLists: CODE_LISTS,
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

  it("finds two values adding one code to a list with different labels", () => {
    expect(
      findAddedCodeConflicts({
        picks: { [GENDER.id]: { ...SEX_PICK, direction: "encode" } },
        resolutions: {
          [GENDER.id]: {
            x: { action: "add", text: "8" },
            u: { action: "add", text: " 8 " },
            "7": { action: "add", text: "6" },
          },
        },
        unmatchedByColumnId: UNMATCHED,
      }),
    ).toEqual([
      { columnId: GENDER.id, valueKey: "x", codeListId: SEX_LIST.id, code: "8" },
      { columnId: GENDER.id, valueKey: "u", codeListId: SEX_LIST.id, code: "8" },
    ]);
  });

  it("finds no conflict when two columns add the same pair", () => {
    expect(
      findAddedCodeConflicts({
        picks: { [GENDER.id]: SEX_PICK, [COUNTY.id]: SEX_PICK },
        resolutions: {
          [GENDER.id]: { u: { action: "add", text: "Undisclosed" } },
          [COUNTY.id]: { u: { action: "add", text: "Undisclosed" } },
        },
        unmatchedByColumnId: new Map([
          ...UNMATCHED,
          [COUNTY.id, [{ value: "U", valueKey: "u", rowCount: 1 }]],
        ]),
      }),
    ).toEqual([]);
  });

  it("trims only spaces from an added pair, as value keys do", () => {
    expect(
      buildAddedPairs({
        picks: { [GENDER.id]: SEX_PICK },
        resolutions: {
          [GENDER.id]: { "\tu": { action: "add", text: " Tab " } },
        },
        unmatchedByColumnId: new Map([
          [GENDER.id, [{ value: "\tU ", valueKey: "\tu", rowCount: 1 }]],
        ]),
      }),
    ).toEqual([{ codeListId: SEX_LIST.id, code: "\tU", label: "Tab" }]);
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
