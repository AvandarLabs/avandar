import { describe, expect, it } from "vitest";
import { buildMappingCsvRows } from "@/lib/crosswalks/buildMappingCsvRows/buildMappingCsvRows";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

const KINGS = "layout-kings" as CrosswalkLayout.Id;
const QUEENS = "layout-queens" as CrosswalkLayout.Id;
const BRONX = "layout-bronx" as CrosswalkLayout.Id;
const CASE_ID = "column-case-id" as CrosswalkColumn.Id;
const SEX = "column-sex" as CrosswalkColumn.Id;
const COUNTY = "column-county" as CrosswalkColumn.Id;
const SEX_129 = "list-sex-129" as DataDictionaryCodeList.Id;
const SEX_MFU = "list-sex-mfu" as DataDictionaryCodeList.Id;

type ColumnFill = Extract<CrosswalkMapping.Fill, { kind: "column" }>;

function _columnFill(
  sourceColumn: string,
  overrides: Partial<ColumnFill> = {},
): ColumnFill {
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId: undefined,
    holdsLabels: false,
    ...overrides,
  };
}

function _mapping(
  fill: CrosswalkMapping.Fill,
  status: CrosswalkMapping.Status = "confirmed",
): CrosswalkDraft.Mapping {
  return {
    id: `mapping-${JSON.stringify(fill)}` as CrosswalkMapping.Id,
    fill,
    status,
    confidence: undefined,
    reason: undefined,
  };
}

function _layout(
  id: CrosswalkLayout.Id,
  datasetIds: readonly string[],
  overrides: Partial<CrosswalkDraft.Layout> = {},
): CrosswalkDraft.Layout {
  return {
    id,
    key: id,
    signature: `l1.${id}`,
    columnNames: [],
    isReference: false,
    status: "review",
    datasetIds: datasetIds as Dataset.Id[],
    ...overrides,
  };
}

const DRAFT: CrosswalkDraft.T = {
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
      entryId: "entry-sex" as DataDictionaryEntry.Id,
    },
    {
      id: COUNTY,
      name: "county",
      position: 2,
      dataType: "varchar",
      entryId: undefined,
    },
  ],
  layouts: [
    _layout(KINGS, ["dataset-kings-03", "dataset-kings-04"], {
      isReference: true,
      status: "mapped",
    }),
    _layout(QUEENS, ["dataset-queens-03"]),
    _layout(BRONX, ["dataset-bronx-03"], { status: "skipped" }),
  ],
  mappings: {
    [KINGS]: {
      [CASE_ID]: _mapping(_columnFill("CaseNo")),
      [SEX]: _mapping(_columnFill("GENDER", { codeListId: SEX_129 })),
      [COUNTY]: _mapping({ kind: "constant", value: "Kings" }),
    },
    [QUEENS]: {
      [CASE_ID]: _mapping(
        _columnFill("case id", {
          convert: { kind: "trim_and_fix_case", letterCase: "upper" },
        }),
        "suggested",
      ),
      [SEX]: _mapping(
        _columnFill("sex", { codeListId: SEX_MFU, holdsLabels: true }),
      ),
    },
    [BRONX]: {
      [CASE_ID]: _mapping({
        kind: "expression",
        sql: "concat({prefix}, {number})",
      }),
    },
  },
};

function _datasetsById(
  names: Readonly<Record<string, string>>,
): Map<string, CrosswalkLayout.Dataset> {
  return new Map(
    Object.entries(names).map(([id, name]) => {
      return [id, { id: id as Dataset.Id, name, columns: [] }] as const;
    }),
  );
}

const DATASETS_BY_ID = _datasetsById({
  "dataset-kings-03": "Kings line list 2026-03",
  "dataset-kings-04": "Kings line list 2026-04",
  "dataset-queens-03": "Queens line list 2026-03",
  "dataset-bronx-03": "Bronx line list 2026-03",
});

/** The M/F/U list is missing on purpose: it stands for a deleted list. */
const CODE_LIST_NAMES = new Map<string, string>([[SEX_129, "Sex (1/2/9)"]]);

/** Names a layout after the first dataset it is given, as the view does. */
function _nameLayout(datasetIds: readonly Dataset.Id[]): string {
  const [firstDatasetId] = datasetIds;
  return firstDatasetId ? (DATASETS_BY_ID.get(firstDatasetId)?.name ?? "") : "";
}

function _build(
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset> = DATASETS_BY_ID,
) {
  return buildMappingCsvRows({
    draft: DRAFT,
    datasetsById,
    codeListNamesById: CODE_LIST_NAMES,
    nameLayout: _nameLayout,
  });
}

describe("buildMappingCsvRows", () => {
  it("lists every dataset and column, the reference layout first and datasets by name", () => {
    expect(
      _build().map((row) => {
        return `${row.datasetName} / ${row.columnName}`;
      }),
    ).toEqual([
      "Kings line list 2026-03 / case_id",
      "Kings line list 2026-03 / sex",
      "Kings line list 2026-03 / county",
      "Kings line list 2026-04 / case_id",
      "Kings line list 2026-04 / sex",
      "Kings line list 2026-04 / county",
      "Queens line list 2026-03 / case_id",
      "Queens line list 2026-03 / sex",
      "Queens line list 2026-03 / county",
      "Bronx line list 2026-03 / case_id",
      "Bronx line list 2026-03 / sex",
      "Bronx line list 2026-03 / county",
    ]);
  });

  it("names the source column, the code list, and the fixed value of a reference dataset", () => {
    expect(_build().slice(0, 3)).toEqual([
      {
        layoutName: "Kings line list 2026-03",
        isReferenceLayout: true,
        datasetName: "Kings line list 2026-03",
        columnName: "case_id",
        fillKind: "column",
        filledFrom: "CaseNo",
        convert: undefined,
        translation: undefined,
        status: "confirmed",
      },
      {
        layoutName: "Kings line list 2026-03",
        isReferenceLayout: true,
        datasetName: "Kings line list 2026-03",
        columnName: "sex",
        fillKind: "column",
        filledFrom: "GENDER",
        convert: undefined,
        translation: { codeListName: "Sex (1/2/9)", holdsLabels: false },
        status: "confirmed",
      },
      {
        layoutName: "Kings line list 2026-03",
        isReferenceLayout: true,
        datasetName: "Kings line list 2026-03",
        columnName: "county",
        fillKind: "constant",
        filledFrom: "Kings",
        convert: undefined,
        translation: undefined,
        status: "confirmed",
      },
    ]);
  });

  it("marks a suggestion, a column with no fill, and a code list that no longer exists", () => {
    expect(_build().slice(6, 9)).toEqual([
      {
        layoutName: "Queens line list 2026-03",
        isReferenceLayout: false,
        datasetName: "Queens line list 2026-03",
        columnName: "case_id",
        fillKind: "column",
        filledFrom: "case id",
        convert: { kind: "trim_and_fix_case", letterCase: "upper" },
        translation: undefined,
        status: "suggested",
      },
      {
        layoutName: "Queens line list 2026-03",
        isReferenceLayout: false,
        datasetName: "Queens line list 2026-03",
        columnName: "sex",
        fillKind: "column",
        filledFrom: "sex",
        convert: undefined,
        translation: { codeListName: undefined, holdsLabels: true },
        status: "confirmed",
      },
      {
        layoutName: "Queens line list 2026-03",
        isReferenceLayout: false,
        datasetName: "Queens line list 2026-03",
        columnName: "county",
        fillKind: "none",
        filledFrom: undefined,
        convert: undefined,
        translation: undefined,
        status: "not_filled",
      },
    ]);
  });

  it("marks every row of a skipped layout skipped and keeps its Combine expression", () => {
    const bronxRows = _build().slice(9);

    expect(
      bronxRows.map((row) => {
        return row.status;
      }),
    ).toEqual(["skipped", "skipped", "skipped"]);
    expect(bronxRows[0]).toMatchObject({
      fillKind: "expression",
      filledFrom: "concat({prefix}, {number})",
    });
  });

  it("leaves out a dataset the user can no longer read and names its layout from the readable ones", () => {
    const rows = _build(
      _datasetsById({
        "dataset-kings-04": "Kings line list 2026-04",
        "dataset-queens-03": "Queens line list 2026-03",
      }),
    );

    expect(rows[0]).toMatchObject({
      layoutName: "Kings line list 2026-04",
      datasetName: "Kings line list 2026-04",
    });
    expect(rows).toHaveLength(6);
  });
});
