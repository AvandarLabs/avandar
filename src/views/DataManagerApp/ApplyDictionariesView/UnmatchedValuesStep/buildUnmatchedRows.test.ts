import { describe, expect, it } from "vitest";
import {
  COUNTY,
  GENDER,
  SEX_LIST,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { buildUnmatchedRows } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/buildUnmatchedRows";

const BLANK_LIST = {
  ...SEX_LIST,
  pairs: [
    ...SEX_LIST.pairs,
    { code: "8", label: " ", acceptedSpellings: [], isMissing: false },
  ],
};

describe("buildUnmatchedRows", () => {
  it("splits values into converted and reference columns, in column order", () => {
    const rows = buildUnmatchedRows({
      columns: [GENDER, COUNTY],
      picks: {
        [GENDER.id]: SEX_PICK,
        [COUNTY.id]: { ...SEX_PICK, mode: "reference" },
      },
      codeLists: new Map([[SEX_LIST.id, BLANK_LIST]]),
      unmatchedByColumnId: new Map([
        [GENDER.id, [{ value: "7", valueKey: "7", rowCount: 3 }]],
        [COUNTY.id, [{ value: "8", valueKey: "8", rowCount: 1 }]],
      ]),
    });

    expect(
      rows.converted.map((row) => {
        return row.item.value;
      }),
    ).toEqual(["7"]);
    expect(
      rows.reference.map((row) => {
        return row.item.value;
      }),
    ).toEqual(["8"]);
    expect(rows.converted[0]?.isInListWithoutLabel).toBe(false);
    expect(rows.reference[0]?.isInListWithoutLabel).toBe(true);
  });

  it("merges values that differ only in case or spaces, showing the most common", () => {
    const rows = buildUnmatchedRows({
      columns: [GENDER],
      picks: { [GENDER.id]: SEX_PICK },
      codeLists: new Map([[SEX_LIST.id, SEX_LIST]]),
      unmatchedByColumnId: new Map([
        [
          GENDER.id,
          [
            { value: " X ", valueKey: "x", rowCount: 2 },
            { value: "x", valueKey: "x", rowCount: 5 },
            { value: "Y", valueKey: "y", rowCount: 1 },
          ],
        ],
      ]),
    });

    expect(
      rows.converted.map((row) => {
        return row.item;
      }),
    ).toEqual([
      { value: "x", valueKey: "x", rowCount: 7 },
      { value: "Y", valueKey: "y", rowCount: 1 },
    ]);
  });

  it("marks a value that a whole-number column cannot keep as text", () => {
    const rows = buildUnmatchedRows({
      columns: [GENDER],
      picks: { [GENDER.id]: { ...SEX_PICK, direction: "encode" } },
      codeLists: new Map([[SEX_LIST.id, SEX_LIST]]),
      unmatchedByColumnId: new Map([
        [
          GENDER.id,
          [
            { value: "X", valueKey: "x", rowCount: 2 },
            { value: " 7 ", valueKey: "7", rowCount: 1 },
          ],
        ],
      ]),
    });

    expect(
      rows.converted.map((row) => {
        return row.cannotStayAsText;
      }),
    ).toEqual([true, false]);
  });

  it("leaves out a column whose pick has no code list or whose list is gone", () => {
    const rows = buildUnmatchedRows({
      columns: [GENDER],
      picks: { [GENDER.id]: { ...SEX_PICK, codeListId: undefined } },
      codeLists: new Map(),
      unmatchedByColumnId: new Map([
        [GENDER.id, [{ value: "7", valueKey: "7", rowCount: 3 }]],
      ]),
    });

    expect(rows).toEqual({ converted: [], reference: [] });
  });
});
