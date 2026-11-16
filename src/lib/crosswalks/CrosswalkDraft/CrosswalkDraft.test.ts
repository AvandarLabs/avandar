import { describe, expect, it } from "vitest";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkDataset } from "$/models/crosswalks/CrosswalkDataset/CrosswalkDataset";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const CROSSWALK_ID = "cccccccc-0000-4000-8000-000000000001" as Crosswalk.Id;
const REFERENCE_ID =
  "11111111-0000-4000-8000-000000000001" as CrosswalkLayout.Id;
const KINGS_LAYOUT_ID =
  "11111111-0000-4000-8000-000000000002" as CrosswalkLayout.Id;
const EMPTY_LAYOUT_ID =
  "11111111-0000-4000-8000-000000000003" as CrosswalkLayout.Id;
const BRONX_ID = "dddddddd-0000-4000-8000-000000000001" as Dataset.Id;
const KINGS_APRIL_ID = "dddddddd-0000-4000-8000-000000000002" as Dataset.Id;
const KINGS_MARCH_ID = "dddddddd-0000-4000-8000-000000000003" as Dataset.Id;
const CASE_COLUMN_ID =
  "22222222-0000-4000-8000-000000000001" as CrosswalkColumn.Id;
const COUNTY_COLUMN_ID =
  "22222222-0000-4000-8000-000000000002" as CrosswalkColumn.Id;
const MAPPING_ID =
  "33333333-0000-4000-8000-000000000001" as CrosswalkMapping.Id;

const DATASETS_BY_ID = new Map([
  [BRONX_ID, { name: "Bronx line list" }],
  [KINGS_APRIL_ID, { name: "Kings line list 2026-04" }],
  [KINGS_MARCH_ID, { name: "Kings line list 2026-03" }],
]);

function _layout(
  id: CrosswalkLayout.Id,
  columnNames: string[],
  overrides: Partial<CrosswalkLayout.T> = {},
): CrosswalkLayout.T {
  return {
    id,
    crosswalkId: CROSSWALK_ID,
    signature: CrosswalkLayout.buildSignature(columnNames),
    columnNames,
    isReference: false,
    status: "to_do",
    ...overrides,
  } as CrosswalkLayout.T;
}

const CONTENTS: CrosswalkDraft.Contents = {
  crosswalk: {
    id: CROSSWALK_ID,
    name: "Measles line lists",
    description: undefined,
    outputDatasetId: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
  } as Crosswalk.T,
  columns: [
    {
      id: COUNTY_COLUMN_ID,
      name: "county",
      position: 4,
      dataType: "varchar",
      entryId: undefined,
    },
    {
      id: CASE_COLUMN_ID,
      name: "case_id",
      position: 1,
      dataType: "varchar",
      entryId: undefined,
    },
  ] as CrosswalkColumn.T[],
  // Out of order on purpose: the draft sorts layouts and their datasets.
  layouts: [
    _layout(EMPTY_LAYOUT_ID, ["zip"]),
    _layout(KINGS_LAYOUT_ID, ["CaseNo", "county"], { status: "review" }),
    _layout(REFERENCE_ID, ["case_id", "county"], {
      isReference: true,
      status: "mapped",
    }),
  ],
  datasets: [
    { datasetId: KINGS_APRIL_ID, layoutId: KINGS_LAYOUT_ID },
    { datasetId: BRONX_ID, layoutId: REFERENCE_ID },
    { datasetId: KINGS_MARCH_ID, layoutId: KINGS_LAYOUT_ID },
  ] as CrosswalkDataset.T[],
  mappings: [
    {
      id: MAPPING_ID,
      layoutId: KINGS_LAYOUT_ID,
      columnId: CASE_COLUMN_ID,
      fill: {
        kind: "column",
        sourceColumn: "CaseNo",
        convert: undefined,
        codeListId: undefined,
        holdsLabels: false,
      },
      status: "suggested",
      confidence: 0.8,
      reason: "name_and_type",
    },
  ] as CrosswalkMapping.T[],
};

describe("CrosswalkDraft.makeEmpty", () => {
  it("starts unsaved, with labels, a source column, and nothing mapped", () => {
    expect(
      CrosswalkDraft.makeEmpty({
        crosswalkId: CROSSWALK_ID,
        name: "Untitled crosswalk",
      }),
    ).toEqual({
      crosswalkId: CROSSWALK_ID,
      isSaved: false,
      name: "Untitled crosswalk",
      description: undefined,
      codesOutputAs: "labels",
      addsSourceColumn: true,
      outputDatasetId: undefined,
      columns: [],
      layouts: [],
      mappings: {},
    });
  });
});

describe("CrosswalkDraft.fromContents", () => {
  const draft = CrosswalkDraft.fromContents(CONTENTS, {
    datasetsById: DATASETS_BY_ID,
  });

  it("orders columns by position and numbers them from 0", () => {
    expect(
      draft.columns.map((column) => {
        return [column.name, column.position];
      }),
    ).toEqual([
      ["case_id", 0],
      ["county", 1],
    ]);
  });

  it("puts the reference first, then layouts by first dataset name, empty last", () => {
    expect(
      draft.layouts.map((layout) => {
        return layout.id;
      }),
    ).toEqual([REFERENCE_ID, KINGS_LAYOUT_ID, EMPTY_LAYOUT_ID]);
  });

  it("sorts each layout's datasets by name and keys it by its column names", () => {
    const kings = draft.layouts[1];
    expect(kings?.datasetIds).toEqual([KINGS_MARCH_ID, KINGS_APRIL_ID]);
    expect(kings?.key).toBe(
      CrosswalkLayout.buildLayoutKey(["CaseNo", "county"]),
    );
  });

  it("groups mappings by layout, then column", () => {
    expect(
      CrosswalkDraft.getFill(draft, KINGS_LAYOUT_ID, CASE_COLUMN_ID),
    ).toEqual({
      id: MAPPING_ID,
      fill: CONTENTS.mappings[0]?.fill,
      status: "suggested",
      confidence: 0.8,
      reason: "name_and_type",
    });
    expect(draft.isSaved).toBe(true);
  });
});

describe("CrosswalkDraft.toSavePayload", () => {
  const draft = CrosswalkDraft.fromContents(CONTENTS, {
    datasetsById: DATASETS_BY_ID,
  });

  it("lists memberships by layout and mappings by layout then column", () => {
    const payload = CrosswalkDraft.toSavePayload({
      ...draft,
      name: "  Measles  ",
    });

    expect(payload.settings).toEqual({
      name: "Measles",
      description: undefined,
      codesOutputAs: "labels",
      addsSourceColumn: true,
    });
    expect(payload.datasets).toEqual([
      { datasetId: BRONX_ID, layoutId: REFERENCE_ID },
      { datasetId: KINGS_MARCH_ID, layoutId: KINGS_LAYOUT_ID },
      { datasetId: KINGS_APRIL_ID, layoutId: KINGS_LAYOUT_ID },
    ]);
    expect(payload.layouts[0]).toEqual({
      id: REFERENCE_ID,
      signature: CrosswalkLayout.buildSignature(["case_id", "county"]),
      columnNames: ["case_id", "county"],
      isReference: true,
      status: "mapped",
    });
    expect(payload.mappings).toEqual([
      {
        id: MAPPING_ID,
        layoutId: KINGS_LAYOUT_ID,
        columnId: CASE_COLUMN_ID,
        fill: CONTENTS.mappings[0]?.fill,
        status: "suggested",
        confidence: 0.8,
        reason: "name_and_type",
      },
    ]);
  });
});

describe("CrosswalkDraft helpers", () => {
  const draft = CrosswalkDraft.fromContents(CONTENTS, {
    datasetsById: DATASETS_BY_ID,
  });

  it("counts the reference and mapped layouts as mapped", () => {
    expect(CrosswalkDraft.countDatasets(draft)).toEqual({
      total: 3,
      mapped: 1,
      skipped: 0,
      unconfirmed: 2,
    });
    const skippedKings = {
      ...draft,
      layouts: draft.layouts.map((layout) => {
        return layout.id === KINGS_LAYOUT_ID
          ? { ...layout, status: "skipped" as const }
          : layout;
      }),
    };
    expect(CrosswalkDraft.countDatasets(skippedKings)).toMatchObject({
      skipped: 2,
      unconfirmed: 0,
    });
  });

  it("finds the reference layout and every dataset", () => {
    expect(CrosswalkDraft.getReferenceLayout(draft)?.id).toBe(REFERENCE_ID);
    expect(CrosswalkDraft.getDatasetIds(draft)).toEqual([
      BRONX_ID,
      KINGS_MARCH_ID,
      KINGS_APRIL_ID,
    ]);
  });

  it("compares content, not whether it was saved or how a fill was built", () => {
    const rebuiltFill = {
      holdsLabels: false,
      codeListId: undefined,
      convert: undefined,
      sourceColumn: "CaseNo",
      kind: "column" as const,
    };
    const rebuilt: CrosswalkDraft.T = {
      ...draft,
      isSaved: false,
      mappings: {
        [KINGS_LAYOUT_ID]: {
          [CASE_COLUMN_ID]: {
            id: MAPPING_ID,
            fill: rebuiltFill,
            status: "suggested",
            confidence: 0.8,
            reason: "name_and_type",
          },
        },
      },
    };
    expect(CrosswalkDraft.isSameContent(draft, rebuilt)).toBe(true);
    expect(
      CrosswalkDraft.isSameContent(draft, { ...draft, name: "Other" }),
    ).toBe(false);
  });
});
