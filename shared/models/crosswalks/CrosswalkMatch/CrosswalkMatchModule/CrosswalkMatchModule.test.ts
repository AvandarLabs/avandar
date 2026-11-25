import { describe, expect, it } from "vitest";
import { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch.ts";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.ts";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

function _profile(
  columnName: string,
  dataType: ColumnProfile.T["dataType"],
  values?: ReadonlyArray<readonly [string, number]>,
): ColumnProfile.T {
  const listed = values?.map(([value, rowCount]) => {
    return { value, rowCount };
  });
  const rowCount = listed
    ? listed.reduce((sum, item) => {
        return sum + item.rowCount;
      }, 0)
    : 100;
  return {
    datasetId: "dataset-kings" as Dataset.Id,
    datasetName: "Kings 2026-03",
    columnName,
    dataType,
    rowCount,
    nonNullCount: rowCount,
    distinctCount: listed?.length ?? 100,
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

const CASE = "c-case" as CrosswalkColumn.Id;
const SEX = "c-sex" as CrosswalkColumn.Id;
const ONSET = "c-onset" as CrosswalkColumn.Id;
const ZIP = "c-zip" as CrosswalkColumn.Id;
const COUNTY = "c-county" as CrosswalkColumn.Id;

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
const ENTRY_SEX: DictionaryMatch.Entry = {
  dictionaryId: "dict-nys" as DataDictionary.Id,
  dictionaryRank: 0,
  entryId: "entry-sex" as DataDictionaryEntry.Id,
  entryName: "sex",
  columnNames: ["GENDER"],
  kind: "categorical",
  position: 0,
  codeLists: [SEX_129, SEX_MFU],
};

/** The reference dataset's columns, the combined dataset's targets. */
const TARGETS: CrosswalkMatch.Target[] = [
  { columnId: CASE, profile: _profile("case_id", "varchar") },
  {
    columnId: SEX,
    profile: _profile("sex", "bigint", [
      ["1", 60],
      ["2", 40],
    ]),
  },
  { columnId: ONSET, profile: _profile("rash_onset_date", "date") },
  {
    columnId: ZIP,
    profile: _profile("zip", "varchar", [
      ["00501", 3],
      ["10451", 7],
    ]),
  },
];

/** A Kings line list's columns, the sources. */
const KINGS_ZIP = _profile("zip", "bigint", [
  ["501", 2],
  ["10451", 8],
]);
const SOURCES: ColumnProfile.T[] = [
  _profile("CaseNo", "varchar"),
  _profile("pt_sex_cd", "bigint", [
    ["1", 55],
    ["2", 45],
  ]),
  _profile("onset_dt", "varchar"),
  KINGS_ZIP,
];

describe("CrosswalkMatch.toNameAndTypeProfiles", () => {
  it("builds profiles with no values, so the scorer uses name and type only", () => {
    const [profile] = CrosswalkMatch.toNameAndTypeProfiles({
      datasetId: "dataset-queens" as Dataset.Id,
      datasetName: "Queens 2026-03",
      columns: [{ name: "zip_code", dataType: "varchar" }],
    });

    expect(profile).toMatchObject({
      columnName: "zip_code",
      dataType: "varchar",
      values: undefined,
      rowCount: 0,
      nonNullCount: 0,
    });
  });
});

describe("CrosswalkMatch.matchLayoutColumns", () => {
  const matches = CrosswalkMatch.matchLayoutColumns({
    targets: TARGETS,
    sources: SOURCES,
  });

  it("fills each target from one source, in target order", () => {
    expect(
      matches.map((match) => {
        return [match.columnId, match.sourceColumn, match.band];
      }),
    ).toEqual([
      [CASE, "CaseNo", "suggestion"],
      [SEX, "pt_sex_cd", "suggestion"],
      [ONSET, "onset_dt", "suggestion"],
      [ZIP, "zip", "match"],
    ]);
  });

  it("pins the scores: half the name and the type (0.654), the date name on text (0.708), and zip whose values agree once leading zeros are dropped (0.9)", () => {
    expect(matches[0]?.score).toBeCloseTo(0.6538, 4);
    expect(matches[2]?.score).toBeCloseTo(0.7077, 4);
    expect(matches[3]?.score).toBe(0.9);
  });

  it("says same values when the values agree and the names do not (pt_sex_cd and sex, name 0.5)", () => {
    expect(matches[1]).toMatchObject({ reason: "same_values", score: 0.775 });
    expect(matches[0]?.reason).toBe("name_and_type");
  });

  it("calls GENDER and sex_cd a name match, since their names score 0.67", () => {
    const [match] = CrosswalkMatch.matchLayoutColumns({
      targets: [
        {
          columnId: SEX,
          profile: _profile("GENDER", "bigint", [
            ["1", 5],
            ["2", 5],
          ]),
        },
      ],
      sources: [
        _profile("sex_cd", "bigint", [
          ["1", 5],
          ["2", 5],
        ]),
      ],
    });

    expect(match?.reason).toBe("name_and_type");
  });

  it("leaves out a pair under the suggestion score (case_dt on a text column scores 0.5)", () => {
    expect(
      CrosswalkMatch.matchLayoutColumns({
        targets: [{ columnId: CASE, profile: _profile("case_id", "varchar") }],
        sources: [_profile("case_dt", "date")],
      }),
    ).toEqual([]);
  });

  it("breaks equal scores by target order, then source order", () => {
    const tied = CrosswalkMatch.matchLayoutColumns({
      targets: [
        { columnId: ZIP, profile: _profile("zip", "varchar") },
        { columnId: COUNTY, profile: _profile("zip_code", "varchar") },
      ],
      sources: [_profile("ZIP", "varchar"), _profile("postcode", "varchar")],
    });

    expect(
      tied.map((match) => {
        return [match.columnId, match.sourceColumn, match.score];
      }),
    ).toEqual([
      [ZIP, "ZIP", 1],
      [COUNTY, "postcode", 1],
    ]);
  });
});

describe("CrosswalkMatch.carryOverFills", () => {
  const FILLS: Array<{
    columnId: CrosswalkColumn.Id;
    fill: CrosswalkMapping.Fill;
  }> = [
    {
      columnId: SEX,
      fill: {
        kind: "column",
        sourceColumn: "gender",
        convert: undefined,
        codeListId: SEX_129.id,
        holdsLabels: false,
      },
    },
    {
      columnId: ZIP,
      fill: {
        kind: "column",
        sourceColumn: "zip",
        convert: { kind: "pad_text", length: 5 },
        codeListId: undefined,
        holdsLabels: false,
      },
    },
    { columnId: COUNTY, fill: { kind: "constant", value: "Bronx" } },
    { columnId: ONSET, fill: { kind: "empty" } },
    {
      columnId: CASE,
      fill: { kind: "expression", sql: "concat({Case No}, '-', {year})" },
    },
  ];

  it("keeps fills whose columns exist, renamed to this layout's spelling", () => {
    expect(
      CrosswalkMatch.carryOverFills({
        fills: FILLS,
        columnNames: ["case no", "GENDER", "zip_code"],
      }),
    ).toEqual([
      {
        columnId: SEX,
        fill: {
          kind: "column",
          sourceColumn: "GENDER",
          convert: undefined,
          codeListId: SEX_129.id,
          holdsLabels: false,
        },
      },
      { columnId: COUNTY, fill: { kind: "constant", value: "Bronx" } },
      { columnId: ONSET, fill: { kind: "empty" } },
    ]);
  });

  it("keeps an expression once every placeholder exists here", () => {
    const carried = CrosswalkMatch.carryOverFills({
      fills: FILLS,
      columnNames: ["Case No", "YEAR"],
    });

    expect(carried).toContainEqual(FILLS[4]);
  });
});

describe("CrosswalkMatch.chooseCodeList", () => {
  it("picks M/F/U over 1/2/9 for a column holding M and F", () => {
    expect(
      CrosswalkMatch.chooseCodeList({
        profile: _profile("sex", "varchar", [
          ["M", 40],
          ["F", 38],
        ]),
        entry: ENTRY_SEX,
      }),
    ).toEqual({ codeListId: SEX_MFU.id, holdsLabels: false, coverage: 1 });
  });

  it("says the column holds labels when it holds Male and Female", () => {
    expect(
      CrosswalkMatch.chooseCodeList({
        profile: _profile("sex", "varchar", [
          ["Male", 40],
          ["Female", 38],
        ]),
        entry: ENTRY_SEX,
      }),
    ).toEqual({ codeListId: SEX_129.id, holdsLabels: true, coverage: 1 });
  });

  it("falls back to the primary list holding codes when values were not read", () => {
    expect(
      CrosswalkMatch.chooseCodeList({
        profile: _profile("sex", "varchar"),
        entry: ENTRY_SEX,
      }),
    ).toEqual({
      codeListId: SEX_129.id,
      holdsLabels: false,
      coverage: undefined,
    });
  });

  it("is undefined for an entry with no code list", () => {
    expect(
      CrosswalkMatch.chooseCodeList({
        profile: _profile("sex", "varchar"),
        entry: { ...ENTRY_SEX, codeLists: [] },
      }),
    ).toBeUndefined();
  });
});

describe("CrosswalkMatch.suggestConvert", () => {
  const ZIP_TARGET = TARGETS[3]!.profile;

  it("pads a ZIP stored as a whole number to the reference's five digits", () => {
    expect(
      CrosswalkMatch.suggestConvert({
        source: KINGS_ZIP,
        target: ZIP_TARGET,
        targetDataType: "varchar",
        dateFormat: undefined,
      }),
    ).toEqual({ kind: "pad_text", length: 5 });
  });

  it("pads nothing when every source value already has the length", () => {
    expect(
      CrosswalkMatch.suggestConvert({
        source: _profile("zip", "varchar", [["10451", 3]]),
        target: ZIP_TARGET,
        targetDataType: "varchar",
        dateFormat: undefined,
      }),
    ).toBeUndefined();
  });

  it("pads nothing when the reference's values have different lengths", () => {
    expect(
      CrosswalkMatch.suggestConvert({
        source: KINGS_ZIP,
        target: _profile("zip", "varchar", [
          ["00501", 3],
          ["1045", 7],
        ]),
        targetDataType: "varchar",
        dateFormat: undefined,
      }),
    ).toBeUndefined();
  });

  it("reads a text column in a detected format as a date", () => {
    expect(
      CrosswalkMatch.suggestConvert({
        source: _profile("onset_dt", "varchar"),
        target: _profile("rash_onset_date", "date"),
        targetDataType: "date",
        dateFormat: "%m/%d/%Y",
      }),
    ).toEqual({ kind: "parse_date", format: "%m/%d/%Y" });
  });

  it("reads nothing as a date when no format was detected", () => {
    expect(
      CrosswalkMatch.suggestConvert({
        source: _profile("onset_dt", "varchar"),
        target: _profile("rash_onset_date", "date"),
        targetDataType: "date",
        dateFormat: undefined,
      }),
    ).toBeUndefined();
  });
});

describe("CrosswalkMatch.prefillLayout", () => {
  const COLUMNS = [
    { id: CASE, entryId: undefined, dataType: "varchar" as const },
    { id: SEX, entryId: ENTRY_SEX.entryId, dataType: "varchar" as const },
    { id: ONSET, entryId: undefined, dataType: "date" as const },
    { id: ZIP, entryId: undefined, dataType: "varchar" as const },
    { id: COUNTY, entryId: undefined, dataType: "varchar" as const },
  ];
  const ENTRIES = new Map([[ENTRY_SEX.entryId as string, ENTRY_SEX]]);
  const COUNTY_TARGET = {
    columnId: COUNTY,
    profile: _profile("county", "varchar"),
  };

  it("carries over first, then fills the rest from the scorer, in column order", () => {
    const prefills = CrosswalkMatch.prefillLayout({
      columns: COLUMNS,
      targets: [...TARGETS, COUNTY_TARGET],
      sources: SOURCES,
      carriedOver: [
        { columnId: COUNTY, fill: { kind: "constant", value: "Bronx" } },
      ],
      entriesById: ENTRIES,
      dateFormatsBySourceColumn: new Map([["onset_dt", "%m/%d/%Y"]]),
    });

    expect(prefills).toEqual([
      {
        columnId: CASE,
        fill: {
          kind: "column",
          sourceColumn: "CaseNo",
          convert: undefined,
          codeListId: undefined,
          holdsLabels: false,
        },
        status: "suggested",
        confidence: expect.closeTo(0.6538, 4),
        reason: "name_and_type",
      },
      {
        columnId: SEX,
        fill: {
          kind: "column",
          sourceColumn: "pt_sex_cd",
          convert: undefined,
          codeListId: SEX_129.id,
          holdsLabels: false,
        },
        status: "suggested",
        confidence: 0.775,
        reason: "same_values",
      },
      {
        columnId: ONSET,
        fill: {
          kind: "column",
          sourceColumn: "onset_dt",
          convert: { kind: "parse_date", format: "%m/%d/%Y" },
          codeListId: undefined,
          holdsLabels: false,
        },
        status: "suggested",
        confidence: expect.closeTo(0.7077, 4),
        reason: "name_and_type",
      },
      {
        columnId: ZIP,
        fill: {
          kind: "column",
          sourceColumn: "zip",
          convert: { kind: "pad_text", length: 5 },
          codeListId: undefined,
          holdsLabels: false,
        },
        status: "confirmed",
        confidence: 0.9,
        reason: "name_and_type",
      },
      {
        columnId: COUNTY,
        fill: { kind: "constant", value: "Bronx" },
        status: "suggested",
        confidence: undefined,
        reason: "similar_layout",
      },
    ]);
  });

  it("never fills a second column from a source a carried fill uses", () => {
    const prefills = CrosswalkMatch.prefillLayout({
      columns: COLUMNS,
      targets: TARGETS,
      sources: SOURCES,
      carriedOver: [
        {
          columnId: ZIP,
          fill: {
            kind: "column",
            sourceColumn: "caseno",
            convert: undefined,
            codeListId: undefined,
            holdsLabels: false,
          },
        },
      ],
      entriesById: ENTRIES,
    });

    expect(
      prefills.map((prefill) => {
        return prefill.columnId;
      }),
    ).toEqual([SEX, ONSET, ZIP]);
  });

  it("ignores a carried fill for a column the crosswalk no longer has", () => {
    const prefills = CrosswalkMatch.prefillLayout({
      columns: COLUMNS.slice(0, 1),
      targets: TARGETS.slice(0, 1),
      sources: SOURCES,
      carriedOver: [
        { columnId: COUNTY, fill: { kind: "constant", value: "Bronx" } },
      ],
      entriesById: ENTRIES,
    });

    expect(
      prefills.map((prefill) => {
        return prefill.columnId;
      }),
    ).toEqual([CASE]);
  });
});
