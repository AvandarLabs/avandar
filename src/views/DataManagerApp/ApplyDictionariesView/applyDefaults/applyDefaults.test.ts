import { describe, expect, it } from "vitest";
import { makeInitialSelection } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const NYS = "dict-nys" as DataDictionary.Id;
const CDC = "dict-cdc" as DataDictionary.Id;
const GENDER = { id: "col-gender" as DatasetColumn.Id, name: "GENDER" };
const CASE_NO = { id: "col-case" as DatasetColumn.Id, name: "CaseNo" };

function _match(
  options: Partial<DictionaryMatch.T> &
    Pick<DictionaryMatch.T, "dictionaryId" | "entryId" | "fit">,
): DictionaryMatch.T {
  return {
    dictionaryRank: 0,
    entryName: "entry",
    position: 0,
    codeListId: undefined,
    codeListName: undefined,
    coverage: undefined,
    direction: "decode",
    score: 0.9,
    ...options,
  };
}

const MATCHES = new Map([
  [
    "GENDER",
    [
      _match({
        dictionaryId: CDC,
        entryId: "entry-cdc-sex" as DataDictionaryEntry.Id,
        codeListId: "list-129" as DataDictionaryCodeList.Id,
        coverage: 1,
        fit: "fits",
      }),
    ],
  ],
  [
    "CaseNo",
    [
      _match({
        dictionaryId: NYS,
        entryId: "entry-case" as DataDictionaryEntry.Id,
        fit: "description",
      }),
    ],
  ],
]);
const DICTIONARIES = [{ id: NYS }, { id: CDC }];

describe("makeInitialSelection", () => {
  it("uses every dictionary that matches a column, and only those", () => {
    const selection = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: [
        ...DICTIONARIES,
        { id: "dict-unused" as DataDictionary.Id },
      ],
    });

    expect(selection.dictionaryIds).toEqual([NYS, CDC]);
    expect(selection.picks[GENDER.id]?.dictionaryId).toBe(CDC);
  });

  it("uses only the dictionary named when the flow opened", () => {
    const selection = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: NYS,
      dictionaries: DICTIONARIES,
    });

    expect(selection.dictionaryIds).toEqual([NYS]);
    expect(selection.picks[GENDER.id]).toBeUndefined();
  });

  it("opens with the dataset's current bindings", () => {
    const binding = {
      datasetColumnId: GENDER.id,
      dictionaryId: NYS,
      entryId: "entry-nys-sex" as DataDictionaryEntry.Id,
      codeListId: undefined,
      direction: "decode",
    } as DictionaryBinding.T;

    const selection = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [binding],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
    });

    expect(selection.dictionaryIds).toEqual([NYS]);
    expect(selection.picks[GENDER.id]?.entryId).toBe("entry-nys-sex");
    expect(selection.picks[CASE_NO.id]).toBeUndefined();
  });

  it("ranks dictionaries the same whatever order the columns arrive in", () => {
    const forward = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
    });
    const backward = makeInitialSelection({
      columns: [CASE_NO, GENDER],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
    });

    expect(backward.dictionaryIds).toEqual(forward.dictionaryIds);
  });
});
