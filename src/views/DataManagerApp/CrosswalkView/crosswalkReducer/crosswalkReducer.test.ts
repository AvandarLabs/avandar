import { describe, expect, it } from "vitest";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { compileCrosswalk } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import {
  BRONX,
  CONTEXT,
  CROSSWALK_ID,
  getColumn,
  getLayoutOf,
  KINGS_APRIL,
  KINGS_MARCH,
  KINGS_MAY,
  makeAddedState,
  makeContext,
  makeProfile,
  makeSeededState,
  QUEENS,
  SEX_CODES_ID,
  SEX_ENTRY,
  SEX_ENTRY_ID,
  SEX_LETTERS_ID,
  STARTING_DATASETS,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  canChangeReference,
  crosswalkReducer,
  isCrosswalkDirty,
  makeInitialCrosswalkState,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import { withLayoutMappings } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/prefillCrosswalkLayout";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkState } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

function _fillOf(state: CrosswalkState, layoutId: string, columnName: string) {
  return CrosswalkDraft.getFill(
    state.draft,
    layoutId,
    getColumn(state, columnName).id,
  );
}

function _expectedStatus(state: CrosswalkState, layoutId: string) {
  return CrosswalkLayout.getStatusAfterFill({
    columnIds: state.draft.columns.map((column) => {
      return column.id;
    }),
    filledColumnIds: new Set(Object.keys(state.draft.mappings[layoutId] ?? {})),
  });
}

function _withSuggestion(state: CrosswalkState): CrosswalkState {
  const kings = getLayoutOf(state, KINGS_MARCH.id);
  const sexId = getColumn(state, "sex").id;
  const suggestion: CrosswalkDraft.Mapping = {
    id: "44444444-0000-4000-8000-000000000001" as CrosswalkMapping.Id,
    fill: {
      kind: "column",
      sourceColumn: "GENDER",
      convert: undefined,
      codeListId: SEX_CODES_ID,
      holdsLabels: false,
    },
    status: "suggested",
    confidence: 0.7,
    reason: "same_values",
  };
  return {
    ...state,
    draft: {
      ...state.draft,
      mappings: {
        ...state.draft.mappings,
        [kings.id]: { ...state.draft.mappings[kings.id], [sexId]: suggestion },
      },
    },
  };
}

describe("crosswalkReducer: datasets", () => {
  it("groups datasets by layout and marks one reference, mapped", () => {
    const state = makeAddedState();
    const kings = getLayoutOf(state, KINGS_MARCH.id);
    const references = state.draft.layouts.filter((layout) => {
      return layout.isReference;
    });

    expect(state.draft.layouts).toHaveLength(3);
    expect(kings.datasetIds).toEqual([KINGS_MARCH.id, KINGS_APRIL.id]);
    expect(references).toHaveLength(1);
    expect(references[0]?.status).toBe("mapped");
    expect(state.draft.layouts[0]?.datasetIds).toEqual([BRONX.id]);
  });

  it("ignores datasets already in the crosswalk, not readable, or with no columns", () => {
    const state = makeAddedState();
    const noColumns: CrosswalkLayout.Dataset = {
      id: "dddddddd-0000-4000-8000-0000000000fe" as typeof BRONX.id,
      name: "Empty upload",
      columns: [],
    };
    const next = crosswalkReducer(state, {
      type: "datasets_added",
      datasetIds: [
        KINGS_APRIL.id,
        "dddddddd-0000-4000-8000-0000000000ff" as typeof BRONX.id,
        noColumns.id,
      ],
      context: makeContext([...STARTING_DATASETS, KINGS_MAY, noColumns]),
    });

    expect(next).toBe(state);
  });

  it("prefills a layout added after the columns exist", () => {
    const state = crosswalkReducer(makeSeededState(), {
      type: "dataset_removed",
      datasetId: QUEENS.id,
    });
    const next = crosswalkReducer(state, {
      type: "datasets_added",
      datasetIds: [QUEENS.id],
      context: CONTEXT,
    });
    const queens = getLayoutOf(next, QUEENS.id);

    expect(queens.status).toBe(_expectedStatus(next, queens.id));
    expect(next.draft.layouts[0]?.isReference).toBe(true);
  });

  it("carries a confirmed fill over from the most similar layout", () => {
    const seeded = makeSeededState();
    const kings = getLayoutOf(seeded, KINGS_MARCH.id);
    const withConstant = crosswalkReducer(seeded, {
      type: "fill_set",
      layoutId: kings.id,
      columnId: getColumn(seeded, "sex").id,
      fill: { kind: "constant", value: "Unknown" },
    });
    const next = crosswalkReducer(withConstant, {
      type: "datasets_added",
      datasetIds: [KINGS_MAY.id],
      context: CONTEXT,
    });

    expect(
      _fillOf(next, getLayoutOf(next, KINGS_MAY.id).id, "sex"),
    ).toMatchObject({
      fill: { kind: "constant", value: "Unknown" },
      status: "suggested",
      reason: "similar_layout",
    });
  });

  it("drops a layout left with no dataset, but keeps the reference", () => {
    const seeded = makeSeededState();
    const queensId = getLayoutOf(seeded, QUEENS.id).id;
    const withoutQueens = crosswalkReducer(seeded, {
      type: "dataset_removed",
      datasetId: QUEENS.id,
    });
    const withoutBronx = crosswalkReducer(withoutQueens, {
      type: "dataset_removed",
      datasetId: BRONX.id,
    });

    expect(
      withoutQueens.draft.layouts.some((layout) => {
        return layout.id === queensId;
      }),
    ).toBe(false);
    expect(withoutQueens.draft.mappings[queensId]).toBeUndefined();
    expect(
      CrosswalkDraft.getReferenceLayout(withoutBronx.draft)?.datasetIds,
    ).toEqual([]);
  });
});

describe("crosswalkReducer: the reference", () => {
  it("moves the reference and clears every column and mapping", () => {
    const seeded = makeSeededState();
    const kings = getLayoutOf(seeded, KINGS_MARCH.id);
    const next = crosswalkReducer(seeded, {
      type: "reference_chosen",
      layoutId: kings.id,
    });

    expect(next.draft.layouts[0]?.id).toBe(kings.id);
    expect(next.draft.layouts[0]).toMatchObject({
      isReference: true,
      status: "mapped",
    });
    expect(getLayoutOf(next, BRONX.id)).toMatchObject({
      isReference: false,
      status: "to_do",
    });
    expect(next.draft.columns).toEqual([]);
    expect(next.draft.mappings).toEqual({});
    expect(next.readLayoutIds).toEqual([]);
  });

  it("refuses to move once another layout is mapped", () => {
    const seeded = makeSeededState();
    const kings = getLayoutOf(seeded, KINGS_MARCH.id);
    const confirmed = crosswalkReducer(seeded, {
      type: "layout_confirmed",
      layoutId: kings.id,
    });

    expect(canChangeReference(confirmed.draft)).toBe(false);
    expect(
      crosswalkReducer(confirmed, {
        type: "reference_chosen",
        layoutId: getLayoutOf(confirmed, QUEENS.id).id,
      }),
    ).toBe(confirmed);
  });
});

describe("crosswalkReducer: columns_seeded", () => {
  it("makes one column per reference column, governed where bound", () => {
    const state = makeSeededState();

    expect(
      state.draft.columns.map((column) => {
        return [column.name, column.position, column.entryId];
      }),
    ).toEqual([
      ["case_id", 0, undefined],
      ["sex", 1, SEX_ENTRY_ID],
      ["county", 2, undefined],
    ]);
    expect(getColumn(state, "sex").dataType).toBe(
      CrosswalkSql.getGovernedDataType({
        codesOutputAs: "labels",
        primaryPairs: SEX_ENTRY.codeLists[0]?.pairs ?? [],
      }),
    );
  });

  it("fills the reference layout from itself, confirmed", () => {
    const state = makeSeededState();
    const referenceId = getLayoutOf(state, BRONX.id).id;

    expect(_fillOf(state, referenceId, "sex")).toMatchObject({
      status: "confirmed",
      fill: {
        kind: "column",
        sourceColumn: "sex",
        convert: undefined,
        codeListId: SEX_CODES_ID,
        holdsLabels: false,
      },
    });
  });

  it("prefills every other layout by name and type", () => {
    const state = makeSeededState();
    const kings = getLayoutOf(state, KINGS_MARCH.id);

    expect(_fillOf(state, kings.id, "case_id")).toMatchObject({
      status: "confirmed",
      reason: "name_and_type",
      fill: { kind: "column", sourceColumn: "case_id" },
    });
    expect(_fillOf(state, kings.id, "county")?.status).toBe("confirmed");
    expect(kings.status).toBe(_expectedStatus(state, kings.id));
  });

  it("names the output column without the edge spaces of a padded header", () => {
    const padded: CrosswalkLayout.Dataset = {
      id: "dddddddd-0000-4000-8000-0000000000a1" as typeof BRONX.id,
      name: "Padded header",
      columns: [
        { name: "CaseNo ", dataType: "varchar" },
        { name: " county", dataType: "varchar" },
      ],
    };
    const context = makeContext([padded]);
    const added = crosswalkReducer(
      makeInitialCrosswalkState(
        CrosswalkDraft.makeEmpty({ crosswalkId: CROSSWALK_ID, name: "Padded" }),
        { isSaved: false },
      ),
      { type: "datasets_added", datasetIds: [padded.id], context },
    );
    const state = crosswalkReducer(added, {
      type: "columns_seeded",
      bindingsByColumnName: new Map(),
      context,
    });
    const referenceId = getLayoutOf(state, padded.id).id;
    const result = compileCrosswalk({
      draft: state.draft,
      datasetsById: context.datasetsById,
      entriesById: context.entriesById,
    });
    const savedNames = CrosswalkDraft.toSavePayload(state.draft).columns.map(
      (column) => {
        return column.name;
      },
    );

    expect(savedNames).toEqual(["CaseNo", "county"]);
    expect(_fillOf(state, referenceId, "CaseNo")?.fill).toMatchObject({
      sourceColumn: "CaseNo ",
    });
    expect(result.status).toBe("ready");
    expect(
      result.status === "ready"
        ? result.columns.map((column) => {
            return column.name;
          })
        : [],
    ).toEqual(["source_dataset", ...savedNames]);
    expect(result.status === "ready" ? result.sql : "").toContain(
      'AS "CaseNo"',
    );
    expect(result.status === "ready" ? result.sql : "").toContain('"CaseNo "');
  });

  it("seeds only once", () => {
    const state = makeSeededState();
    expect(
      crosswalkReducer(state, {
        type: "columns_seeded",
        bindingsByColumnName: new Map(),
        context: CONTEXT,
      }),
    ).toBe(state);
  });
});

describe("crosswalkReducer: values_read", () => {
  it("chooses a code list for a confirmed governed fill that has none", () => {
    const state = makeSeededState(
      new Map([
        [
          "sex",
          { entryId: SEX_ENTRY_ID, codeListId: undefined, holdsLabels: false },
        ],
      ]),
    );
    const referenceId = getLayoutOf(state, BRONX.id).id;
    const next = crosswalkReducer(state, {
      type: "values_read",
      layoutId: referenceId,
      sources: [
        makeProfile({
          dataset: BRONX,
          columnName: "sex",
          dataType: "varchar",
          values: ["M", "F"],
        }),
      ],
      targets: [],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });

    expect(_fillOf(next, referenceId, "sex")?.fill).toMatchObject({
      codeListId: SEX_LETTERS_ID,
      holdsLabels: false,
    });
    expect(next.readLayoutIds).toEqual([referenceId]);
  });

  it("chooses again a code list the matcher guessed before the values were read", () => {
    const state = makeSeededState(
      new Map([
        [
          "sex",
          { entryId: SEX_ENTRY_ID, codeListId: undefined, holdsLabels: false },
        ],
      ]),
    );
    const referenceId = getLayoutOf(state, BRONX.id).id;
    const sexId = getColumn(state, "sex").id;
    const guessed = {
      ...state,
      draft: {
        ...state.draft,
        mappings: {
          ...state.draft.mappings,
          [referenceId]: {
            ...state.draft.mappings[referenceId],
            [sexId]: {
              ...state.draft.mappings[referenceId]![sexId]!,
              fill: {
                kind: "column" as const,
                sourceColumn: "sex",
                convert: undefined,
                codeListId: SEX_CODES_ID,
                holdsLabels: false,
              },
              reason: "name_and_type" as const,
              confidence: 0.95,
            },
          },
        },
      },
    };
    const next = crosswalkReducer(guessed, {
      type: "values_read",
      layoutId: referenceId,
      sources: [
        makeProfile({
          dataset: BRONX,
          columnName: "sex",
          dataType: "varchar",
          values: ["M", "F"],
        }),
      ],
      targets: [],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });

    expect(_fillOf(next, referenceId, "sex")?.fill).toMatchObject({
      codeListId: SEX_LETTERS_ID,
    });
  });

  it("keeps a code list the user chose", () => {
    const state = makeSeededState(
      new Map([
        [
          "sex",
          { entryId: SEX_ENTRY_ID, codeListId: undefined, holdsLabels: false },
        ],
      ]),
    );
    const referenceId = getLayoutOf(state, BRONX.id).id;
    const chosen = crosswalkReducer(state, {
      type: "fill_set",
      layoutId: referenceId,
      columnId: getColumn(state, "sex").id,
      fill: {
        kind: "column",
        sourceColumn: "sex",
        convert: undefined,
        codeListId: SEX_CODES_ID,
        holdsLabels: false,
      },
    });
    const next = crosswalkReducer(chosen, {
      type: "values_read",
      layoutId: referenceId,
      sources: [
        makeProfile({
          dataset: BRONX,
          columnName: "sex",
          dataType: "varchar",
          values: ["M", "F"],
        }),
      ],
      targets: [],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });

    expect(_fillOf(next, referenceId, "sex")?.fill).toMatchObject({
      codeListId: SEX_CODES_ID,
    });
  });

  it("keeps a choice of no translation the user made", () => {
    const state = makeSeededState(
      new Map([
        [
          "sex",
          { entryId: SEX_ENTRY_ID, codeListId: undefined, holdsLabels: false },
        ],
      ]),
    );
    const referenceId = getLayoutOf(state, BRONX.id).id;
    const chosen = crosswalkReducer(state, {
      type: "fill_set",
      layoutId: referenceId,
      columnId: getColumn(state, "sex").id,
      fill: {
        kind: "column",
        sourceColumn: "sex",
        convert: undefined,
        codeListId: undefined,
        holdsLabels: false,
      },
    });
    const next = crosswalkReducer(chosen, {
      type: "values_read",
      layoutId: referenceId,
      sources: [
        makeProfile({
          dataset: BRONX,
          columnName: "sex",
          dataType: "varchar",
          values: ["M", "F"],
        }),
      ],
      targets: [],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });

    expect(_fillOf(next, referenceId, "sex")?.fill).toMatchObject({
      codeListId: undefined,
    });
  });

  it("ignores values read for a layout that is not in the crosswalk", () => {
    const state = makeSeededState();
    const next = crosswalkReducer(state, {
      type: "values_read",
      layoutId:
        "99999999-0000-4000-8000-000000000001" as (typeof state.draft.layouts)[number]["id"],
      sources: [],
      targets: [],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });

    expect(next).toBe(state);
  });

  it("never replaces a confirmed fill", () => {
    const seeded = makeSeededState();
    const kings = getLayoutOf(seeded, KINGS_MARCH.id);
    const countyId = getColumn(seeded, "county").id;
    const withConstant = crosswalkReducer(seeded, {
      type: "fill_set",
      layoutId: kings.id,
      columnId: countyId,
      fill: { kind: "constant", value: "Kings" },
    });
    const next = crosswalkReducer(withConstant, {
      type: "values_read",
      layoutId: kings.id,
      sources: [
        makeProfile({
          dataset: KINGS_MARCH,
          columnName: "case_id",
          dataType: "varchar",
        }),
        makeProfile({
          dataset: KINGS_MARCH,
          columnName: "county",
          dataType: "varchar",
        }),
      ],
      targets: [
        {
          columnId: getColumn(seeded, "case_id").id,
          profile: makeProfile({
            dataset: BRONX,
            columnName: "case_id",
            dataType: "varchar",
          }),
        },
        {
          columnId: countyId,
          profile: makeProfile({
            dataset: BRONX,
            columnName: "county",
            dataType: "varchar",
          }),
        },
      ],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });

    expect(_fillOf(next, kings.id, "county")?.fill).toEqual({
      kind: "constant",
      value: "Kings",
    });
    expect(_fillOf(next, kings.id, "case_id")?.status).toBe("confirmed");
    expect(next.readLayoutIds).toContain(kings.id);
  });
});

describe("crosswalkReducer: fills and suggestions", () => {
  it("stores a set fill as confirmed and marks a filled layout for review", () => {
    let state = makeSeededState();
    const kings = getLayoutOf(state, KINGS_MARCH.id);
    state.draft.columns.forEach((column) => {
      state = crosswalkReducer(state, {
        type: "fill_set",
        layoutId: kings.id,
        columnId: column.id,
        fill: { kind: "empty" },
      });
    });

    expect(_fillOf(state, kings.id, "sex")).toMatchObject({
      status: "confirmed",
      confidence: undefined,
      reason: undefined,
    });
    expect(getLayoutOf(state, KINGS_MARCH.id).status).toBe("review");
  });

  it("accepts, rejects, and accepts every suggestion", () => {
    const state = _withSuggestion(makeSeededState());
    const kings = getLayoutOf(state, KINGS_MARCH.id);
    const sexId = getColumn(state, "sex").id;

    const accepted = crosswalkReducer(state, {
      type: "suggestion_accepted",
      layoutId: kings.id,
      columnId: sexId,
    });
    const rejected = crosswalkReducer(state, {
      type: "suggestion_rejected",
      layoutId: kings.id,
      columnId: sexId,
    });
    const allAccepted = crosswalkReducer(state, {
      type: "suggestions_accepted",
      layoutId: kings.id,
    });

    expect(_fillOf(accepted, kings.id, "sex")).toMatchObject({
      status: "confirmed",
      reason: "same_values",
    });
    expect(_fillOf(rejected, kings.id, "sex")).toBeUndefined();
    expect(
      Object.values(allAccepted.draft.mappings[kings.id] ?? {}).every(
        (mapping) => {
          return mapping.status === "confirmed";
        },
      ),
    ).toBe(true);
  });
});

describe("crosswalkReducer: layout status", () => {
  it("confirms every fill, leaves the rest empty, and marks the layout mapped", () => {
    const state = makeSeededState();
    const queens = getLayoutOf(state, QUEENS.id);
    const next = crosswalkReducer(state, {
      type: "layout_confirmed",
      layoutId: queens.id,
    });

    expect(getLayoutOf(next, QUEENS.id).status).toBe("mapped");
    next.draft.columns.forEach((column) => {
      expect(
        CrosswalkDraft.getFill(next.draft, queens.id, column.id)?.status,
      ).toBe("confirmed");
    });
    expect(_fillOf(next, queens.id, "sex")?.fill).toEqual({ kind: "empty" });
  });

  it("skips a layout and reopens it to the status its fills give", () => {
    const state = makeSeededState();
    const kings = getLayoutOf(state, KINGS_MARCH.id);
    const skipped = crosswalkReducer(state, {
      type: "layout_skipped",
      layoutId: kings.id,
    });
    const reopened = crosswalkReducer(skipped, {
      type: "layout_reopened",
      layoutId: kings.id,
    });

    expect(getLayoutOf(skipped, KINGS_MARCH.id).status).toBe("skipped");
    expect(getLayoutOf(reopened, KINGS_MARCH.id).status).toBe(
      _expectedStatus(reopened, kings.id),
    );
  });

  it("never skips the reference", () => {
    const state = makeSeededState();
    const next = crosswalkReducer(state, {
      type: "layout_skipped",
      layoutId: getLayoutOf(state, BRONX.id).id,
    });
    expect(getLayoutOf(next, BRONX.id).status).toBe("mapped");
  });
});

describe("crosswalkReducer: columns", () => {
  const ADDED_ID = "55555555-0000-4000-8000-000000000001" as CrosswalkColumn.Id;

  it("adds a column with no fills and a column back to to do", () => {
    let state = makeSeededState();
    const kings = getLayoutOf(state, KINGS_MARCH.id);
    state.draft.columns.forEach((column) => {
      state = crosswalkReducer(state, {
        type: "fill_set",
        layoutId: kings.id,
        columnId: column.id,
        fill: { kind: "empty" },
      });
    });
    const next = crosswalkReducer(state, {
      type: "column_added",
      columnId: ADDED_ID,
      name: "outbreak",
      dataType: "boolean",
    });

    expect(next.draft.columns.at(-1)).toEqual({
      id: ADDED_ID,
      name: "outbreak",
      position: 3,
      dataType: "boolean",
      entryId: undefined,
    });
    expect(
      CrosswalkDraft.getFill(next.draft, kings.id, ADDED_ID),
    ).toBeUndefined();
    expect(getLayoutOf(next, KINGS_MARCH.id).status).toBe("to_do");
  });

  it("removes a column, its fills, and renumbers the rest", () => {
    const state = makeSeededState();
    const sexId = getColumn(state, "sex").id;
    const next = crosswalkReducer(state, {
      type: "column_removed",
      columnId: sexId,
    });

    expect(
      next.draft.columns.map((column) => {
        return [column.name, column.position];
      }),
    ).toEqual([
      ["case_id", 0],
      ["county", 1],
    ]);
    Object.values(next.draft.mappings).forEach((mappings) => {
      expect(mappings[sexId]).toBeUndefined();
    });
  });

  it("governs a column with a new entry and forgets its old code lists", () => {
    const state = makeSeededState();
    const countyId = getColumn(state, "county").id;
    const bronxId = getLayoutOf(state, BRONX.id).id;
    const withOldList = crosswalkReducer(state, {
      type: "fill_set",
      layoutId: bronxId,
      columnId: countyId,
      fill: {
        kind: "column",
        sourceColumn: "county",
        convert: undefined,
        codeListId: SEX_LETTERS_ID,
        holdsLabels: true,
      },
    });
    const withRead = { ...withOldList, readLayoutIds: [bronxId] };
    const next = crosswalkReducer(withRead, {
      type: "column_changed",
      columnId: countyId,
      changes: { entryId: SEX_ENTRY_ID },
      context: CONTEXT,
    });

    expect(getColumn(next, "county")).toMatchObject({ entryId: SEX_ENTRY_ID });
    expect(_fillOf(next, bronxId, "county")?.fill).toMatchObject({
      codeListId: undefined,
      holdsLabels: false,
    });
    expect(next.readLayoutIds).toEqual([]);
  });

  it("chooses a code list from the values for a fill the user set before the column was governed", () => {
    const state = makeSeededState();
    const countyId = getColumn(state, "county").id;
    const bronxId = getLayoutOf(state, BRONX.id).id;
    const withUserFill = crosswalkReducer(state, {
      type: "fill_set",
      layoutId: bronxId,
      columnId: countyId,
      fill: {
        kind: "column",
        sourceColumn: "county",
        convert: undefined,
        codeListId: undefined,
        holdsLabels: false,
      },
    });
    const governed = crosswalkReducer(withUserFill, {
      type: "column_changed",
      columnId: countyId,
      changes: { entryId: SEX_ENTRY_ID },
      context: CONTEXT,
    });
    const next = crosswalkReducer(governed, {
      type: "values_read",
      layoutId: bronxId,
      sources: [
        makeProfile({
          dataset: BRONX,
          columnName: "county",
          dataType: "varchar",
          values: ["M", "F"],
        }),
      ],
      targets: [],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });

    expect(_fillOf(next, bronxId, "county")?.fill).toMatchObject({
      codeListId: SEX_LETTERS_ID,
      holdsLabels: false,
    });
  });

  it("removes an entry and every fill's code list", () => {
    const state = makeSeededState();
    const next = crosswalkReducer(state, {
      type: "column_changed",
      columnId: getColumn(state, "sex").id,
      changes: { entryId: null },
      context: CONTEXT,
    });

    expect(getColumn(next, "sex").entryId).toBeUndefined();
    expect(
      _fillOf(next, getLayoutOf(next, BRONX.id).id, "sex")?.fill,
    ).toMatchObject({
      codeListId: undefined,
      holdsLabels: false,
    });
  });

  it("keeps what was read when a column is only renamed", () => {
    const state = makeSeededState();
    const withRead = {
      ...state,
      readLayoutIds: [getLayoutOf(state, BRONX.id).id],
    };
    const next = crosswalkReducer(withRead, {
      type: "column_changed",
      columnId: getColumn(state, "county").id,
      changes: { name: "borough" },
      context: CONTEXT,
    });

    expect(next.readLayoutIds).toEqual(withRead.readLayoutIds);
  });

  it("renames a column", () => {
    const state = makeSeededState();
    const next = crosswalkReducer(state, {
      type: "column_changed",
      columnId: getColumn(state, "county").id,
      changes: { name: "borough" },
      context: CONTEXT,
    });
    expect(getColumn(next, "borough").position).toBe(2);
  });

  it("trims the edge spaces of an added or renamed column's name", () => {
    const state = makeSeededState();
    const added = crosswalkReducer(state, {
      type: "column_added",
      columnId: "bbbbbbbb-0000-4000-8000-0000000000a2" as CrosswalkColumn.Id,
      name: " outbreak ",
      dataType: "boolean",
    });
    const renamed = crosswalkReducer(added, {
      type: "column_changed",
      columnId: getColumn(added, "county").id,
      changes: { name: " borough " },
      context: CONTEXT,
    });

    expect(getColumn(renamed, "outbreak").position).toBe(3);
    expect(getColumn(renamed, "borough").position).toBe(2);
  });
});

describe("crosswalkReducer: settings and saving", () => {
  it("re-derives governed types when codes come out as codes", () => {
    const next = crosswalkReducer(makeSeededState(), {
      type: "settings_changed",
      changes: { codesOutputAs: "codes" },
      context: CONTEXT,
    });

    expect(next.draft.codesOutputAs).toBe("codes");
    expect(getColumn(next, "sex").dataType).toBe(
      CrosswalkSql.getGovernedDataType({
        codesOutputAs: "codes",
        primaryPairs: SEX_ENTRY.codeLists[0]?.pairs ?? [],
      }),
    );
    expect(getColumn(next, "county").dataType).toBe("varchar");
  });

  it("marks the draft saved, and keeps an edit made while saving", () => {
    const state = makeSeededState();
    const sent = { ...state.draft, isSaved: true };
    const saved = crosswalkReducer(state, { type: "saved", draft: sent });
    const editedWhileSaving = crosswalkReducer(
      crosswalkReducer(state, { type: "renamed", name: "Renamed" }),
      { type: "saved", draft: sent },
    );

    expect(saved.draft).toBe(sent);
    expect(saved.savedDraft).toBe(sent);
    expect(isCrosswalkDirty(saved)).toBe(false);
    expect(editedWhileSaving.draft).toMatchObject({
      name: "Renamed",
      isSaved: true,
    });
    expect(isCrosswalkDirty(editedWhileSaving)).toBe(true);
  });

  it("counts a draft never saved as dirty", () => {
    expect(isCrosswalkDirty(makeSeededState())).toBe(true);
  });
});

describe("crosswalkReducer: meaning_matches_found", () => {
  /** `state` with a column's fill removed from a layout, status refreshed. */
  function _withoutFill(
    state: CrosswalkState,
    layoutId: CrosswalkLayout.Id,
    columnName: string,
  ): CrosswalkState {
    const columnId = getColumn(state, columnName).id;
    const kept = Object.fromEntries(
      Object.entries(state.draft.mappings[layoutId] ?? {}).filter(
        ([candidate]) => {
          return candidate !== columnId;
        },
      ),
    );
    return { ...state, draft: withLayoutMappings(state.draft, layoutId, kept) };
  }

  /** The seeded state with Kings' `sex` fill removed. */
  function _kingsWithoutSex(): CrosswalkState {
    const seeded = makeSeededState();
    return _withoutFill(seeded, getLayoutOf(seeded, KINGS_MARCH.id).id, "sex");
  }

  /** Dispatches meaning matches for a layout, Kings unless another is given. */
  function _meaningFound(
    state: CrosswalkState,
    matches: ReadonlyArray<{ columnName: string; sourceColumn: string }>,
    layoutId: CrosswalkLayout.Id = getLayoutOf(state, KINGS_MARCH.id).id,
  ): CrosswalkState {
    return crosswalkReducer(state, {
      type: "meaning_matches_found",
      layoutId,
      matches: matches.map((match) => {
        return {
          columnId: getColumn(state, match.columnName).id,
          sourceColumn: match.sourceColumn,
        };
      }),
      sources: [
        makeProfile({
          dataset: KINGS_MARCH,
          columnName: "GENDER",
          dataType: "bigint",
          values: ["1", "2", "9"],
        }),
      ],
      context: CONTEXT,
    });
  }

  it("adds a suggested Meaning fill, with the code list its values fit", () => {
    const state = _kingsWithoutSex();
    const next = _meaningFound(state, [
      { columnName: "sex", sourceColumn: "GENDER" },
    ]);

    expect(_fillOf(next, getLayoutOf(next, KINGS_MARCH.id).id, "sex")).toEqual({
      id: expect.any(String),
      fill: {
        kind: "column",
        sourceColumn: "GENDER",
        convert: undefined,
        codeListId: SEX_CODES_ID,
        holdsLabels: false,
      },
      status: "suggested",
      confidence: undefined,
      reason: "meaning",
    });
  });

  /** Reads Kings' values, with `GENDER` among the source columns. */
  function _kingsValuesRead(state: CrosswalkState): CrosswalkState {
    return crosswalkReducer(state, {
      type: "values_read",
      layoutId: getLayoutOf(state, KINGS_MARCH.id).id,
      sources: [
        makeProfile({
          dataset: KINGS_MARCH,
          columnName: "GENDER",
          dataType: "bigint",
          values: ["1", "2", "9"],
        }),
      ],
      targets: [],
      dateFormatsBySourceColumn: new Map(),
      context: CONTEXT,
    });
  }

  it("keeps a Meaning suggestion when the layout's values are read", () => {
    const found = _meaningFound(_kingsWithoutSex(), [
      { columnName: "sex", sourceColumn: "GENDER" },
    ]);
    const kingsId = getLayoutOf(found, KINGS_MARCH.id).id;
    const read = _kingsValuesRead(found);

    expect(_fillOf(read, kingsId, "sex")).toEqual(
      _fillOf(found, kingsId, "sex"),
    );
    expect(_fillOf(read, kingsId, "sex")).toMatchObject({
      status: "suggested",
      reason: "meaning",
    });
  });

  it("drops a Meaning suggestion whose source column is gone from the layout", () => {
    const found = _meaningFound(_kingsWithoutSex(), [
      { columnName: "sex", sourceColumn: "GENDER" },
    ]);
    const kingsId = getLayoutOf(found, KINGS_MARCH.id).id;
    const withoutSource: CrosswalkState = {
      ...found,
      draft: {
        ...found.draft,
        layouts: found.draft.layouts.map((layout) => {
          return layout.id === kingsId
            ? {
                ...layout,
                columnNames: layout.columnNames.filter((name) => {
                  return name !== "GENDER";
                }),
              }
            : layout;
        }),
      },
    };

    expect(
      _fillOf(_kingsValuesRead(withoutSource), kingsId, "sex"),
    ).toBeUndefined();
  });

  it("moves a To do layout to Review once every column has a fill", () => {
    const state = _kingsWithoutSex();
    const next = _meaningFound(state, [
      { columnName: "sex", sourceColumn: "GENDER" },
    ]);

    expect(getLayoutOf(state, KINGS_MARCH.id).status).toBe("to_do");
    expect(getLayoutOf(next, KINGS_MARCH.id).status).toBe("review");
  });

  it("spells the source as the layout does", () => {
    const next = _meaningFound(_kingsWithoutSex(), [
      { columnName: "sex", sourceColumn: "gender" },
    ]);

    expect(
      _fillOf(next, getLayoutOf(next, KINGS_MARCH.id).id, "sex")?.fill,
    ).toMatchObject({
      sourceColumn: "GENDER",
    });
  });

  it("never replaces a fill that exists", () => {
    const state = makeSeededState();

    expect(
      _meaningFound(state, [
        { columnName: "case_id", sourceColumn: "onset_dt" },
      ]),
    ).toBe(state);
  });

  it("drops a source another fill reads", () => {
    const state = _kingsWithoutSex();

    expect(
      _meaningFound(state, [{ columnName: "sex", sourceColumn: "CASE_ID" }]),
    ).toBe(state);
  });

  it("drops a source the layout does not have", () => {
    const state = _kingsWithoutSex();

    expect(
      _meaningFound(state, [{ columnName: "sex", sourceColumn: "gender_cd" }]),
    ).toBe(state);
  });

  it("uses each source for one column only, first match first", () => {
    const seeded = _kingsWithoutSex();
    const kingsId = getLayoutOf(seeded, KINGS_MARCH.id).id;
    const state = _withoutFill(seeded, kingsId, "county");
    const next = _meaningFound(state, [
      { columnName: "sex", sourceColumn: "onset_dt" },
      { columnName: "county", sourceColumn: "ONSET_DT" },
    ]);

    expect(_fillOf(next, kingsId, "sex")?.fill).toMatchObject({
      sourceColumn: "onset_dt",
    });
    expect(_fillOf(next, kingsId, "county")).toBeUndefined();
  });

  it("leaves the reference layout alone", () => {
    const seeded = makeSeededState();
    const referenceId = getLayoutOf(seeded, BRONX.id).id;
    const withoutReferenceSex = _withoutFill(seeded, referenceId, "sex");

    expect(
      _meaningFound(
        withoutReferenceSex,
        [{ columnName: "sex", sourceColumn: "sex" }],
        referenceId,
      ),
    ).toBe(withoutReferenceSex);
  });

  it("leaves a skipped layout alone", () => {
    const kingsWithoutSex = _kingsWithoutSex();
    const skipped = crosswalkReducer(kingsWithoutSex, {
      type: "layout_skipped",
      layoutId: getLayoutOf(kingsWithoutSex, KINGS_MARCH.id).id,
    });

    expect(
      _meaningFound(skipped, [{ columnName: "sex", sourceColumn: "GENDER" }]),
    ).toBe(skipped);
  });

  it("leaves a mapped layout alone, even with a column unfilled", () => {
    const state = _kingsWithoutSex();
    const kingsId = getLayoutOf(state, KINGS_MARCH.id).id;
    const mapped: CrosswalkState = {
      ...state,
      draft: {
        ...state.draft,
        layouts: state.draft.layouts.map((layout) => {
          return layout.id === kingsId
            ? { ...layout, status: "mapped" }
            : layout;
        }),
      },
    };

    expect(
      _meaningFound(mapped, [{ columnName: "sex", sourceColumn: "GENDER" }]),
    ).toBe(mapped);
  });
});
