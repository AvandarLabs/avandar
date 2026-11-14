import { describe, expect, it } from "vitest";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { compileCrosswalk } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  CrosswalkDraftLayout,
  CrosswalkDraftMapping,
  CrosswalkDraftT,
} from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft.types";

const KINGS_COLUMNS = ["CaseNo", "GENDER"];
const QUEENS_COLUMNS = ["case_id", "sex", "full_name"];

function _dataset(
  id: string,
  name: string,
  columnNames: readonly string[],
): CrosswalkLayout.Dataset {
  return {
    id: id as Dataset.Id,
    name,
    columns: columnNames.map((columnName) => {
      return { name: columnName, dataType: "varchar" as const };
    }),
  };
}

const DATASETS = [
  _dataset("dataset-k1", "Kings 2026-03", KINGS_COLUMNS),
  _dataset("dataset-k2", "Kings 2026-04", KINGS_COLUMNS),
  _dataset("dataset-q1", "Queens 2026-03", QUEENS_COLUMNS),
  _dataset("dataset-b1", "Bronx 2026-03", ["CaseNo", "GENDER", "county"]),
];
const DATASETS_BY_ID = new Map(
  DATASETS.map((dataset) => {
    return [dataset.id as string, dataset] as const;
  }),
);

function _pair(code: string, label: string): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings: [], isMissing: false };
}

const SEX_129 = {
  id: "list-129" as DataDictionaryCodeList.Id,
  name: "Sex (1/2/9)",
  pairs: [_pair("1", "Male"), _pair("2", "Female"), _pair("9", "Unknown")],
};
const SEX_MFU = {
  id: "list-mfu" as DataDictionaryCodeList.Id,
  name: "Sex (M/F/U)",
  pairs: [_pair("M", "Male"), _pair("F", "Female"), _pair("U", "Unknown")],
};
const ENTRY_SEX: DictionaryMatch.Entry = {
  dictionaryId: "dict-nys" as DataDictionary.Id,
  dictionaryRank: 0,
  entryId: "entry-sex" as DataDictionaryEntry.Id,
  entryName: "sex",
  columnNames: [],
  kind: "categorical",
  position: 0,
  codeLists: [SEX_129, SEX_MFU],
};
const ENTRIES_BY_ID = new Map([[ENTRY_SEX.entryId as string, ENTRY_SEX]]);

const CASE_ID = "col-case" as CrosswalkColumn.Id;
const SEX = "col-sex" as CrosswalkColumn.Id;

function _layout(
  id: string,
  columnNames: readonly string[],
  datasetIds: readonly string[],
  changes: Partial<CrosswalkDraftLayout> = {},
): CrosswalkDraftLayout {
  return {
    id: id as CrosswalkLayout.Id,
    key: CrosswalkLayout.buildLayoutKey(columnNames),
    signature: CrosswalkLayout.buildSignature(columnNames),
    columnNames,
    isReference: false,
    status: "review",
    datasetIds: datasetIds as Dataset.Id[],
    ...changes,
  };
}

function _mapping(
  fill: CrosswalkMapping.Fill,
  status: CrosswalkMapping.Status = "confirmed",
): CrosswalkDraftMapping {
  return {
    id: "mapping-1" as CrosswalkMapping.Id,
    fill,
    status,
    confidence: undefined,
    reason: undefined,
  };
}

function _columnFill(
  sourceColumn: string,
  codeListId?: DataDictionaryCodeList.Id,
): CrosswalkMapping.Fill {
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId,
    holdsLabels: false,
  };
}

function _draft(changes: Partial<CrosswalkDraftT> = {}): CrosswalkDraftT {
  return {
    crosswalkId: "crosswalk-1" as Crosswalk.Id,
    isSaved: true,
    name: "Measles line lists",
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
    outputDatasetId: undefined,
    columns: [
      {
        id: CASE_ID,
        name: "case_id",
        position: 0,
        dataType: "varchar",
        entryId: undefined,
      },
      {
        id: SEX,
        name: "sex",
        position: 1,
        dataType: "varchar",
        entryId: ENTRY_SEX.entryId,
      },
    ],
    layouts: [
      _layout("layout-kings", KINGS_COLUMNS, ["dataset-k1", "dataset-k2"], {
        isReference: true,
        status: "mapped",
      }),
      _layout("layout-queens", QUEENS_COLUMNS, ["dataset-q1"]),
    ],
    mappings: {
      "layout-kings": {
        [CASE_ID]: _mapping(_columnFill("CaseNo")),
        [SEX]: _mapping(_columnFill("GENDER", SEX_129.id)),
      },
      "layout-queens": {
        [CASE_ID]: _mapping(_columnFill("case_id"), "suggested"),
        [SEX]: _mapping(_columnFill("sex", SEX_MFU.id), "suggested"),
      },
    },
    ...changes,
  };
}

function _compile(draft: CrosswalkDraftT): ReturnType<typeof compileCrosswalk> {
  return compileCrosswalk({
    draft,
    datasetsById: DATASETS_BY_ID,
    entriesById: ENTRIES_BY_ID,
  });
}

describe("compileCrosswalk", () => {
  it("compiles every layout's datasets with the source column first", () => {
    const result = _compile(_draft());

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }
    expect(result.includedDatasetIds).toEqual([
      "dataset-k1",
      "dataset-k2",
      "dataset-q1",
    ]);
    expect(result.columns).toEqual([
      { name: "source_dataset", dataType: "varchar" },
      { name: "case_id", dataType: "varchar" },
      { name: "sex", dataType: "varchar" },
    ]);
    expect(result.sql).toContain(`'Kings 2026-04' AS "__ava_source_dataset"`);
  });

  it("binds each governed column to its entry's primary list, holding labels in labels mode", () => {
    const result = _compile(_draft());

    expect(result.status === "ready" && result.bindings).toEqual([
      {
        columnName: "sex",
        dictionaryId: ENTRY_SEX.dictionaryId,
        entryId: ENTRY_SEX.entryId,
        codeListId: SEX_129.id,
        direction: "encode",
      },
    ]);
  });

  it("binds governed columns as holding codes in codes mode", () => {
    const result = _compile(_draft({ codesOutputAs: "codes" }));

    expect(result.status === "ready" && result.bindings[0]?.direction).toBe(
      "decode",
    );
  });

  it("binds nothing for a column whose entry is gone", () => {
    const result = compileCrosswalk({
      draft: _draft(),
      datasetsById: DATASETS_BY_ID,
      entriesById: new Map(),
    });

    expect(result.status === "ready" && result.bindings).toEqual([]);
  });

  it("fingerprints every code list the SQL embedded", () => {
    const result = _compile(_draft());

    expect(result.status === "ready" && result.compiledCodeLists).toEqual([
      {
        codeListId: SEX_129.id,
        fingerprint: CrosswalkSql.getCodeListFingerprint(SEX_129.pairs),
      },
      {
        codeListId: SEX_MFU.id,
        fingerprint: CrosswalkSql.getCodeListFingerprint(SEX_MFU.pairs),
      },
    ]);
  });

  it("counts the datasets of layouts not yet confirmed", () => {
    expect(_compile(_draft()).problems).toEqual([
      { kind: "unconfirmed", datasetCount: 1 },
    ]);
  });

  it("leaves out and counts a skipped layout's datasets", () => {
    const draft = _draft();
    const result = _compile({
      ...draft,
      layouts: [draft.layouts[0]!, { ...draft.layouts[1]!, status: "skipped" }],
    });

    expect(result.status === "ready" && result.includedDatasetIds).toEqual([
      "dataset-k1",
      "dataset-k2",
    ]);
    expect(result.problems).toEqual([{ kind: "skipped", datasetCount: 1 }]);
  });

  it("leaves out a dataset whose columns changed since it was mapped", () => {
    const draft = _draft();
    const result = _compile({
      ...draft,
      layouts: [
        {
          ...draft.layouts[0]!,
          datasetIds: ["dataset-b1", "dataset-k1"] as Dataset.Id[],
        },
        draft.layouts[1]!,
      ],
    });

    expect(result.status === "ready" && result.includedDatasetIds).toEqual([
      "dataset-k1",
      "dataset-q1",
    ]);
    expect(result.problems).toContainEqual({
      kind: "columns_changed",
      datasetId: "dataset-b1",
      datasetName: "Bronx 2026-03",
    });
  });

  it("leaves out a layout with no dataset, even the reference", () => {
    const draft = _draft();
    const result = _compile({
      ...draft,
      layouts: [{ ...draft.layouts[0]!, datasetIds: [] }, draft.layouts[1]!],
    });

    expect(result.status === "ready" && result.includedDatasetIds).toEqual([
      "dataset-q1",
    ]);
  });

  it("blocks on a Combine expression naming a column the layout lacks", () => {
    const draft = _draft();
    const result = _compile({
      ...draft,
      mappings: {
        ...draft.mappings,
        "layout-queens": {
          [CASE_ID]: _mapping({ kind: "expression", sql: "upper({CaseNo})" }),
        },
      },
    });

    expect(result).toEqual({
      status: "blocked",
      problems: [
        {
          kind: "invalid_expression",
          layoutId: "layout-queens",
          columnId: CASE_ID,
        },
        { kind: "unconfirmed", datasetCount: 1 },
      ],
    });
  });

  it("compiles a Combine expression over the layout's own columns", () => {
    const draft = _draft();
    const result = _compile({
      ...draft,
      mappings: {
        ...draft.mappings,
        "layout-queens": {
          [CASE_ID]: _mapping({
            kind: "expression",
            sql: "upper({Full_Name})",
          }),
        },
      },
    });

    expect(result.status === "ready" && result.sql).toContain(
      `TRY_CAST((upper("Full_Name")) AS VARCHAR) AS "case_id"`,
    );
  });

  it("reports a fill whose code list is gone, and lets its values pass through", () => {
    const draft = _draft();
    const result = _compile({
      ...draft,
      mappings: {
        ...draft.mappings,
        "layout-queens": {
          [SEX]: _mapping(
            _columnFill("sex", "list-gone" as DataDictionaryCodeList.Id),
          ),
        },
      },
    });

    expect(result.status).toBe("ready");
    expect(result.problems).toContainEqual({
      kind: "missing_code_list",
      layoutId: "layout-queens",
      columnId: SEX,
    });
    expect(result.status === "ready" && result.sql).toContain(
      `CAST("sex" AS VARCHAR) AS "sex"`,
    );
  });

  it("blocks when every layout is skipped", () => {
    const draft = _draft();
    const result = _compile({
      ...draft,
      layouts: draft.layouts.map((layout) => {
        return { ...layout, status: "skipped" as const };
      }),
    });

    expect(result).toEqual({
      status: "blocked",
      problems: [
        { kind: "skipped", datasetCount: 3 },
        { kind: "nothing_to_combine" },
      ],
    });
  });

  it("reports a dataset it cannot read as left out, named by its id", () => {
    const draft = _draft();
    const result = compileCrosswalk({
      draft,
      datasetsById: new Map(
        [...DATASETS_BY_ID].filter(([datasetId]) => {
          return datasetId !== "dataset-k2";
        }),
      ),
      entriesById: ENTRIES_BY_ID,
    });

    expect(result.status === "ready" && result.includedDatasetIds).toEqual([
      "dataset-k1",
      "dataset-q1",
    ]);
    expect(result.problems).toContainEqual({
      kind: "columns_changed",
      datasetId: "dataset-k2",
      datasetName: "dataset-k2",
    });
  });

  describe("when a layout's datasets type a column differently", () => {
    function _compileKingsTypes(
      firstType: AvaDataType.T,
      secondType: AvaDataType.T,
      readColumn = "GENDER",
    ): ReturnType<typeof compileCrosswalk> {
      const typed = (
        id: string,
        name: string,
        dataType: AvaDataType.T,
      ): CrosswalkLayout.Dataset => {
        return {
          id: id as Dataset.Id,
          name,
          columns: KINGS_COLUMNS.map((columnName) => {
            return {
              name: columnName,
              dataType: columnName === readColumn ? dataType : "varchar",
            };
          }),
        };
      };
      return compileCrosswalk({
        draft: _draft(),
        datasetsById: new Map([
          ...DATASETS_BY_ID,
          ["dataset-k1", typed("dataset-k1", "Kings 2026-03", firstType)],
          ["dataset-k2", typed("dataset-k2", "Kings 2026-04", secondType)],
        ]),
        entriesById: ENTRIES_BY_ID,
      });
    }

    it.each([
      ["bigint", "date"],
      ["date", "boolean"],
      ["bigint", "timestamp"],
      ["time", "date"],
      ["double", "time"],
    ] as const)(
      "leaves out a %s dataset stacked with a %s one",
      (first, second) => {
        const result = _compileKingsTypes(first, second);

        expect(result.status === "ready" && result.includedDatasetIds).toEqual([
          "dataset-k1",
          "dataset-q1",
        ]);
        expect(result.problems).toContainEqual({
          kind: "column_types_differ",
          datasetId: "dataset-k2",
          datasetName: "Kings 2026-04",
        });
      },
    );

    it.each([
      ["bigint", "double"],
      ["date", "timestamp"],
      ["boolean", "varchar"],
      ["date", "varchar"],
      ["bigint", "bigint"],
    ] as const)("stacks a %s dataset with a %s one", (first, second) => {
      const result = _compileKingsTypes(first, second);

      expect(result.status === "ready" && result.includedDatasetIds).toEqual([
        "dataset-k1",
        "dataset-k2",
        "dataset-q1",
      ]);
      expect(result.problems).toEqual([
        { kind: "unconfirmed", datasetCount: 1 },
      ]);
    });

    it("ignores a column no fill of the layout reads", () => {
      const result = _compileKingsTypes("bigint", "date", "unread");

      expect(result.status === "ready" && result.includedDatasetIds).toEqual([
        "dataset-k1",
        "dataset-k2",
        "dataset-q1",
      ]);
    });
  });

  it("drops the source column when the crosswalk adds none", () => {
    const result = _compile(_draft({ addsSourceColumn: false }));

    expect(result.status === "ready" && result.columns[0]?.name).toBe(
      "case_id",
    );
    expect(result.status === "ready" && result.sql).not.toContain(
      "source_dataset",
    );
  });
});
