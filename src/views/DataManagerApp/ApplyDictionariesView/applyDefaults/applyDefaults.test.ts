import { describe, expect, it } from "vitest";
import {
  makeInitialSelection,
  resolutionsFromBindings,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
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
const REFERENCE_BINDING = {
  datasetColumnId: GENDER.id,
  dictionaryId: NYS,
  entryId: "entry-nys-sex" as DataDictionaryEntry.Id,
  codeListId: undefined,
  direction: "decode",
  mode: "reference",
  keepsOriginal: false,
  valueOverrides: [],
  pinnedPairs: undefined,
  pinnedIsOrdered: undefined,
  replacedDataType: undefined,
} as unknown as DictionaryBinding.T;

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
      defaultMode: "reference",
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
      defaultMode: "reference",
    });

    expect(selection.dictionaryIds).toEqual([NYS]);
    expect(selection.picks[GENDER.id]).toBeUndefined();
  });

  it("opens with the dataset's current bindings", () => {
    const binding = REFERENCE_BINDING;

    const selection = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [binding],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
      defaultMode: "reference",
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
      defaultMode: "reference",
    });
    const backward = makeInitialSelection({
      columns: [CASE_NO, GENDER],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
      defaultMode: "reference",
    });

    expect(backward.dictionaryIds).toEqual(forward.dictionaryIds);
  });

  it("gives a tied column to the dictionary that covers the most columns", () => {
    const AGE = { id: "col-age" as DatasetColumn.Id, name: "AGE" };
    const OUTCOME = { id: "col-outcome" as DatasetColumn.Id, name: "OUTCOME" };
    const fitting = (dictionaryId: DataDictionary.Id, rank: number) => {
      return _match({
        dictionaryId,
        dictionaryRank: rank,
        entryId: `entry-${dictionaryId}` as DataDictionaryEntry.Id,
        codeListId: `list-${dictionaryId}` as DataDictionaryCodeList.Id,
        coverage: 1,
        fit: "fits",
      });
    };
    const selection = makeInitialSelection({
      columns: [GENDER, AGE, OUTCOME],
      matchesByColumnName: new Map([
        ["GENDER", [fitting(CDC, 1)]],
        ["AGE", [fitting(CDC, 1)]],
        ["OUTCOME", [fitting(NYS, 0), fitting(CDC, 1)]],
      ]),
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
      defaultMode: "reference",
    });

    expect(selection.dictionaryIds).toEqual([CDC, NYS]);
    expect(selection.picks[OUTCOME.id]?.dictionaryId).toBe(CDC);
  });
  it("starts new coded picks in the default mode and keeps a binding's own", () => {
    const SES = { id: "col-ses" as DatasetColumn.Id, name: "SES" };
    const converted = {
      ...REFERENCE_BINDING,
      codeListId: "list-nys-sex" as DataDictionaryCodeList.Id,
      mode: "convert",
      keepsOriginal: true,
    } as DictionaryBinding.T;
    const selection = makeInitialSelection({
      columns: [GENDER, SES],
      matchesByColumnName: new Map([
        ...MATCHES,
        [
          "SES",
          [
            _match({
              dictionaryId: NYS,
              entryId: "entry-ses" as DataDictionaryEntry.Id,
              codeListId: "list-ses" as DataDictionaryCodeList.Id,
              coverage: 1,
              fit: "fits",
            }),
          ],
        ],
      ]),
      existingBindings: [converted],
      preselectedDictionaryId: NYS,
      dictionaries: DICTIONARIES,
      defaultMode: "convert",
    });

    expect(selection.picks[GENDER.id]).toMatchObject({
      mode: "convert",
      keepsOriginal: true,
      isDirectionFromData: false,
    });
    expect(selection.picks[SES.id]?.mode).toBe("convert");
  });

  it("reopens a converted column's overrides as resolutions", () => {
    const converted = {
      ...REFERENCE_BINDING,
      mode: "convert",
      valueOverrides: [
        { value: " M ", action: "map", code: "1" },
        { value: "7", action: "empty" },
      ],
    } as DictionaryBinding.T;

    expect(resolutionsFromBindings([converted])).toEqual({
      [converted.datasetColumnId]: {
        m: { action: "map", code: "1" },
        "7": { action: "empty" },
      },
    });
  });
});
