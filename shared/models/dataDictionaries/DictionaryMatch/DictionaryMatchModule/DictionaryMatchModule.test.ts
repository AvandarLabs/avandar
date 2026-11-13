import { describe, expect, it } from "vitest";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const NYS = "dict-nys" as DataDictionary.Id;
const CDC = "dict-cdc" as DataDictionary.Id;

function _profile(
  columnName: string,
  values: ReadonlyArray<readonly [string, number]> | undefined,
  dataType: ColumnProfile.T["dataType"] = "bigint",
): ColumnProfile.T {
  const listed = values?.map(([value, rowCount]) => {
    return { value, rowCount };
  });
  const rowCount = (listed ?? []).reduce((sum, item) => {
    return sum + item.rowCount;
  }, 0);
  return {
    datasetId: "dataset-1" as Dataset.Id,
    datasetName: "Bronx line list",
    columnName,
    dataType,
    rowCount,
    nonNullCount: rowCount,
    distinctCount: listed?.length ?? 1000,
    values: listed,
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _pairs(
  pairs: ReadonlyArray<readonly [string, string]>,
): DataDictionaryCodeList.Pair[] {
  return pairs.map(([code, label]) => {
    return { code, label, acceptedSpellings: [], isMissing: false };
  });
}

function _entry(
  options: Partial<DictionaryMatch.Entry> &
    Pick<DictionaryMatch.Entry, "entryId" | "entryName">,
): DictionaryMatch.Entry {
  return {
    dictionaryId: NYS,
    dictionaryRank: 0,
    columnNames: [],
    kind: "categorical",
    position: 0,
    codeLists: [],
    ...options,
  };
}

const SEX_129 = {
  id: "list-129" as DataDictionaryCodeList.Id,
  name: "Sex (1/2/9)",
  pairs: _pairs([
    ["1", "Male"],
    ["2", "Female"],
    ["9", "Unknown"],
  ]),
};
const SEX_MFU = {
  id: "list-mfu" as DataDictionaryCodeList.Id,
  name: "Sex (M/F/U)",
  pairs: _pairs([
    ["M", "Male"],
    ["F", "Female"],
    ["U", "Unknown"],
  ]),
};
const GENDER = _profile("GENDER", [
  ["1", 611],
  ["2", 577],
  ["9", 16],
]);

describe("DictionaryMatch.getEntryMatch", () => {
  it("picks the code list that covers the column's values", () => {
    const match = DictionaryMatch.getEntryMatch(
      GENDER,
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        columnNames: ["GENDER"],
        codeLists: [SEX_MFU, SEX_129],
      }),
    );

    expect(match).toMatchObject({
      codeListId: SEX_129.id,
      coverage: 1,
      direction: "decode",
      fit: "fits",
    });
  });

  it("reads a column of labels as labels", () => {
    const match = DictionaryMatch.getEntryMatch(
      _profile(
        "sex",
        [
          ["Male", 10],
          ["female", 8],
        ],
        "varchar",
      ),
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        codeLists: [SEX_129],
      }),
    );

    expect(match?.direction).toBe("encode");
    expect(match?.coverage).toBe(1);
  });

  it("says the values do not fit when the names match but the codes do not", () => {
    const match = DictionaryMatch.getEntryMatch(
      GENDER,
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        columnNames: ["GENDER"],
        codeLists: [SEX_MFU],
      }),
    );

    expect(match?.fit).toBe("values_dont_fit");
    expect(match?.coverage).toBe(0);
  });

  it("matches an entry with no codes as a description", () => {
    const match = DictionaryMatch.getEntryMatch(
      _profile("CaseNo", undefined, "varchar"),
      _entry({
        entryId: "entry-case" as DataDictionaryEntry.Id,
        entryName: "case_id",
        columnNames: ["CaseNo"],
        kind: "identifier",
      }),
    );

    expect(match?.fit).toBe("description");
  });

  it("ignores an entry whose name and values share nothing with the column", () => {
    expect(
      DictionaryMatch.getEntryMatch(
        GENDER,
        _entry({
          entryId: "entry-zip" as DataDictionaryEntry.Id,
          entryName: "zip_code",
          kind: "text",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("DictionaryMatch.findColumnMatches", () => {
  const nysSex = _entry({
    entryId: "entry-nys-sex" as DataDictionaryEntry.Id,
    entryName: "sex",
    columnNames: ["GENDER"],
    codeLists: [SEX_MFU],
  });
  const cdcSex = _entry({
    dictionaryId: CDC,
    dictionaryRank: 1,
    entryId: "entry-cdc-sex" as DataDictionaryEntry.Id,
    entryName: "sex",
    columnNames: ["GENDER"],
    codeLists: [SEX_129],
  });

  it("puts the match whose codes fit first", () => {
    const matches = DictionaryMatch.findColumnMatches(
      [GENDER],
      [nysSex, cdcSex],
    ).get("GENDER");

    expect(
      matches?.map((match) => {
        return match.dictionaryId;
      }),
    ).toEqual([CDC, NYS]);
  });

  it("orders matches the same whatever order the entries arrive in", () => {
    const forward = DictionaryMatch.findColumnMatches(
      [GENDER],
      [nysSex, cdcSex],
    );
    const backward = DictionaryMatch.findColumnMatches(
      [GENDER],
      [cdcSex, nysSex],
    );

    expect(backward).toEqual(forward);
  });

  it("breaks a tie by the dictionary's place in the list", () => {
    const sameInCdc = { ...cdcSex, codeLists: [SEX_129] };
    const sameInNys = { ...nysSex, codeLists: [SEX_129] };

    const matches = DictionaryMatch.findColumnMatches(
      [GENDER],
      [sameInCdc, sameInNys],
    ).get("GENDER");

    expect(matches?.[0]?.dictionaryId).toBe(NYS);
  });
});

describe("DictionaryMatch.pickDefaultMatch", () => {
  it("never starts a column on a list whose values do not fit", () => {
    const match = DictionaryMatch.getEntryMatch(
      GENDER,
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        columnNames: ["GENDER"],
        codeLists: [SEX_MFU],
      }),
    );

    expect(
      DictionaryMatch.pickDefaultMatch(match ? [match] : []),
    ).toBeUndefined();
  });

  it("falls back to a description when no list fits", () => {
    const description = DictionaryMatch.getEntryMatch(
      _profile("CaseNo", undefined, "varchar"),
      _entry({
        entryId: "entry-case" as DataDictionaryEntry.Id,
        entryName: "case_id",
        columnNames: ["CaseNo"],
        kind: "identifier",
      }),
    );

    expect(
      DictionaryMatch.pickDefaultMatch(description ? [description] : [])?.fit,
    ).toBe("description");
  });
});
