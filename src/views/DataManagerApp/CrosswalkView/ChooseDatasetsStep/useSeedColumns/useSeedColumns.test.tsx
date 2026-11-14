import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import {
  BRONX,
  CONTEXT,
  makeCrosswalkCatalog,
  makeCrosswalkFlow,
  SEX_CODES_ID,
  SEX_ENTRY_ID,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  BRONX_LAYOUT,
  BRONX_LAYOUT_ID,
  KINGS_LAYOUT,
  KINGS_LAYOUT_ID,
  makeLayoutsDraft,
  makeMappedDraft,
  makeStateFromDraft,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalkSteps.fixtures";
import {
  buildReferenceBindings,
  getFirstLayoutToMap,
  useSeedColumns,
} from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/useSeedColumns/useSeedColumns";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { CrosswalkCatalog } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

/** Bronx's column names by column id, as the catalog holds them. */
const COLUMN_NAME_BY_ID: ReadonlyMap<string, string> = new Map([
  ["col-case_id", "case_id"],
  ["col-sex", "sex"],
  ["col-county", "county"],
  ["col-zip", "zip"],
]);

function _binding(
  columnName: string,
  overrides: Partial<DictionaryBinding.T> = {},
): DictionaryBinding.T {
  return {
    datasetColumnId: `col-${columnName}`,
    datasetId: BRONX.id,
    entryId: SEX_ENTRY_ID,
    codeListId: SEX_CODES_ID,
    mode: "reference",
    direction: "decode",
    ...overrides,
  } as DictionaryBinding.T;
}

/** A loaded catalog holding Bronx's sex binding. */
function _catalog(overrides: Partial<CrosswalkCatalog> = {}): CrosswalkCatalog {
  return {
    ...makeCrosswalkCatalog(),
    bindingsByDatasetId: new Map([[BRONX.id, [_binding("sex")]]]),
    columnNameById: COLUMN_NAME_BY_ID,
    ...overrides,
  };
}

function _renderSeed(
  flow: CrosswalkFlow,
  catalog: CrosswalkCatalog = _catalog(),
) {
  return renderHook(() => {
    return useSeedColumns({ flow, catalog });
  });
}

describe("buildReferenceBindings", () => {
  it("says which bound columns the crosswalk reads as labels", () => {
    const bindings = buildReferenceBindings({
      columnNameById: COLUMN_NAME_BY_ID,
      bindings: [
        _binding("case_id", { mode: "reference", direction: "encode" }),
        _binding("sex", { mode: "reference", direction: "decode" }),
        _binding("county", { mode: "convert", direction: "decode" }),
        _binding("zip", { mode: "convert", direction: "encode" }),
      ],
    });

    expect(
      [...bindings].map(([name, binding]) => {
        return [name, binding.holdsLabels];
      }),
    ).toEqual([
      ["case_id", true],
      ["sex", false],
      ["county", true],
      ["zip", false],
    ]);
  });

  it("skips a binding whose entry was deleted or whose column is gone", () => {
    const bindings = buildReferenceBindings({
      columnNameById: COLUMN_NAME_BY_ID,
      bindings: [_binding("sex", { entryId: undefined }), _binding("gone")],
    });

    expect(bindings.size).toBe(0);
  });
});

describe("getFirstLayoutToMap", () => {
  it("opens the first layout still to map, else the reference", () => {
    expect(getFirstLayoutToMap(makeMappedDraft())).toBe(KINGS_LAYOUT_ID);
    expect(
      getFirstLayoutToMap(
        makeMappedDraft({
          layouts: [BRONX_LAYOUT, { ...KINGS_LAYOUT, status: "skipped" }],
        }),
      ),
    ).toBe(BRONX_LAYOUT_ID);
  });
});

describe("useSeedColumns", () => {
  it("seeds the columns with the first save, then opens the first layout to map", async () => {
    const flow = makeCrosswalkFlow({
      state: makeStateFromDraft(makeLayoutsDraft({ isSaved: false })),
    });
    const { result } = _renderSeed(flow);
    expect(result.current.isReady).toBe(true);

    await act(async () => {
      await result.current.continueToMapping();
    });

    expect(flow.dispatchAndSave).toHaveBeenCalledWith({
      type: "columns_seeded",
      bindingsByColumnName: new Map([
        [
          "sex",
          {
            entryId: SEX_ENTRY_ID,
            codeListId: SEX_CODES_ID,
            holdsLabels: false,
          },
        ],
      ]),
      context: CONTEXT,
    });
    expect(flow.save).not.toHaveBeenCalled();
    expect(flow.goToStep).toHaveBeenCalledWith("map", KINGS_LAYOUT_ID);
    expect(
      vi.mocked(flow.dispatchAndSave).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(flow.goToStep).mock.invocationCallOrder[0] ?? 0);
  });

  it("stays on the step when the save fails", async () => {
    const flow = makeCrosswalkFlow({
      state: makeStateFromDraft(makeLayoutsDraft()),
      dispatchAndSave: vi.fn(() => {
        return Promise.resolve(false);
      }),
    });
    const { result } = _renderSeed(flow);

    await act(async () => {
      await result.current.continueToMapping();
    });

    expect(flow.goToStep).not.toHaveBeenCalled();
    expect(result.current.isWorking).toBe(false);
  });

  it("saves a changed crosswalk that has columns, then moves on", async () => {
    const draft = makeMappedDraft();
    const state = makeStateFromDraft(draft, {
      savedDraft: { ...draft, name: "Old name" },
    });
    const flow = makeCrosswalkFlow({ state });
    const { result } = _renderSeed(flow);

    await act(async () => {
      await result.current.continueToMapping();
    });

    expect(flow.dispatchAndSave).not.toHaveBeenCalled();
    expect(flow.save).toHaveBeenCalledWith(state.draft);
    expect(flow.goToStep).toHaveBeenCalledWith("map", KINGS_LAYOUT_ID);
  });

  it("moves on without saving when nothing changed", async () => {
    const flow = makeCrosswalkFlow({
      state: makeStateFromDraft(makeMappedDraft()),
    });
    const { result } = _renderSeed(flow);

    await act(async () => {
      await result.current.continueToMapping();
    });

    expect(flow.dispatchAndSave).not.toHaveBeenCalled();
    expect(flow.save).not.toHaveBeenCalled();
    expect(flow.goToStep).toHaveBeenCalledWith("map", KINGS_LAYOUT_ID);
  });

  it("is not ready to seed while the catalog loads or with no reference dataset", async () => {
    const loading = makeCrosswalkFlow({
      state: makeStateFromDraft(makeLayoutsDraft()),
    });
    const { result } = _renderSeed(loading, _catalog({ isLoading: true }));
    expect(result.current.isReady).toBe(false);
    await act(async () => {
      await result.current.continueToMapping();
    });
    expect(loading.dispatchAndSave).not.toHaveBeenCalled();

    const emptyReference = makeCrosswalkFlow({
      state: makeStateFromDraft(
        makeLayoutsDraft({ layouts: [{ ...BRONX_LAYOUT, datasetIds: [] }] }),
      ),
    });
    expect(_renderSeed(emptyReference).result.current.isReady).toBe(false);
  });
});
