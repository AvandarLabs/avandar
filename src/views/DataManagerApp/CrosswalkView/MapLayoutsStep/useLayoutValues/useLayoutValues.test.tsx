import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  BRONX,
  CONTEXT,
  KINGS_APRIL,
  KINGS_MARCH,
  makeProfile,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  BRONX_LAYOUT,
  BRONX_LAYOUT_ID,
  CASE_COLUMN,
  KINGS_LAYOUT,
  KINGS_LAYOUT_ID,
  makeMappedDraft,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalkSteps.fixtures";
import {
  buildLayoutTargets,
  useLayoutValues,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useLayoutValues/useLayoutValues";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

const mocks = vi.hoisted(() => {
  return { profileMock: vi.fn(), detectMock: vi.fn() };
});

vi.mock(
  "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns",
  () => {
    return { profileDatasetColumns: mocks.profileMock };
  },
);
vi.mock("@/lib/crosswalks/detectDateFormats/detectDateFormats", () => {
  return { detectDateFormats: mocks.detectMock };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

/** A profile of one column with listed values; `onset_dt` reads as dates. */
function _profile(
  dataset: CrosswalkLayout.Dataset,
  column: { name: string; dataType: AvaDataType.T },
): ColumnProfile.T {
  return {
    ...makeProfile({
      dataset,
      columnName: column.name,
      dataType: column.dataType,
      values: ["x"],
    }),
    dateShare: column.name === "onset_dt" ? 1 : 0,
  };
}

type RenderProps = {
  layoutId: CrosswalkLayout.Id;
  readLayoutIds: readonly CrosswalkLayout.Id[];
  draft: CrosswalkDraft.T;
};

/**
 * Renders the hook for Kings by default. `rerender` takes only what changes
 * and keeps the other props as they were.
 */
function _renderValues(options: Partial<RenderProps> = {}) {
  const dispatch = vi.fn();
  let props: RenderProps = {
    layoutId: options.layoutId ?? KINGS_LAYOUT_ID,
    readLayoutIds: options.readLayoutIds ?? [],
    draft: options.draft ?? makeMappedDraft(),
  };
  const rendered = renderHook(
    (current: RenderProps) => {
      return useLayoutValues({ ...current, context: CONTEXT, dispatch });
    },
    { initialProps: props },
  );
  return {
    ...rendered,
    dispatch,
    rerender: (changes: Partial<RenderProps>) => {
      props = { ...props, ...changes };
      rendered.rerender(props);
    },
  };
}

/** Each target's column name, and whether it was matched without values. */
function _describeTargets(
  targets: readonly CrosswalkMatch.Target[],
): Array<[string, boolean]> {
  return targets.map((target) => {
    return [target.profile.columnName, target.profile.values === undefined];
  });
}

describe("useLayoutValues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileMock.mockImplementation(async (options) => {
      return options.columns.map(
        (column: { name: string; dataType: AvaDataType.T }) => {
          return _profile(options.dataset, column);
        },
      );
    });
    mocks.detectMock.mockResolvedValue(new Map([["onset_dt", "%m/%d/%Y"]]));
  });

  it("reads a layout's values once and matches it against the reference", async () => {
    const { result, dispatch } = _renderValues();

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(mocks.profileMock).toHaveBeenCalledTimes(2);
    expect(mocks.profileMock.mock.calls[0]?.[0].dataset.id).toBe(
      KINGS_MARCH.id,
    );
    expect(mocks.profileMock.mock.calls[0]?.[0].readsRawValues).toBeUndefined();
    expect(mocks.profileMock.mock.calls[1]?.[0].dataset.id).toBe(BRONX.id);
    expect(mocks.detectMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      datasetId: KINGS_MARCH.id,
      columnNames: ["onset_dt"],
    });
    expect([...result.current.profilesBySourceColumn.keys()]).toEqual([
      "case_id",
      "GENDER",
      "county",
      "onset_dt",
    ]);
    expect(result.current.dateFormatsBySourceColumn).toEqual(
      new Map([["onset_dt", "%m/%d/%Y"]]),
    );
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0]?.[0];
    expect(action).toMatchObject({
      type: "values_read",
      layoutId: KINGS_LAYOUT_ID,
      dateFormatsBySourceColumn: new Map([["onset_dt", "%m/%d/%Y"]]),
      context: CONTEXT,
    });
    expect(action.sources).toHaveLength(4);
    expect(_describeTargets(action.targets)).toEqual([
      ["case_id", false],
      ["sex", false],
      ["county", false],
      // Not in the reference dataset: matched by name and type only.
      ["rash_onset_date", true],
    ]);
    expect(result.current.targets).toEqual(action.targets);
  });

  it("keys every result by the layout's spelling when its first dataset spells a column another way", async () => {
    // April alone: the layout keeps March's `case_id`, April says `CASE_ID`.
    mocks.detectMock.mockResolvedValue(new Map([["ONSET_DT", "%m/%d/%Y"]]));
    const draft = makeMappedDraft({
      layouts: [
        BRONX_LAYOUT,
        { ...KINGS_LAYOUT, datasetIds: [KINGS_APRIL.id] },
      ],
    });
    const { result, dispatch } = _renderValues({ draft });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(mocks.profileMock.mock.calls[0]?.[0].dataset.id).toBe(
      KINGS_APRIL.id,
    );
    expect([...result.current.profilesBySourceColumn.keys()]).toEqual([
      "case_id",
      "GENDER",
      "county",
      "onset_dt",
    ]);
    expect(result.current.dateFormatsBySourceColumn).toEqual(
      new Map([["onset_dt", "%m/%d/%Y"]]),
    );
    const action = dispatch.mock.calls[0]?.[0];
    expect(
      action.sources.map((source: ColumnProfile.T) => {
        return source.columnName;
      }),
    ).toEqual(["case_id", "GENDER", "county", "onset_dt"]);
  });

  it("returns the values again without dispatching for a layout already read", async () => {
    const { result, dispatch } = _renderValues({
      readLayoutIds: [KINGS_LAYOUT_ID],
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current.profilesBySourceColumn.size).toBe(4);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches once even when it renders again before the state catches up", async () => {
    const { result, dispatch, rerender } = _renderValues();

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    rerender({ readLayoutIds: [] });

    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("dispatches values_read again when the reducer empties readLayoutIds", async () => {
    const { result, dispatch, rerender } = _renderValues();

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    // The reducer records the read, then a column's new entry (column_changed)
    // empties readLayoutIds so every layout is matched again.
    rerender({ readLayoutIds: [KINGS_LAYOUT_ID] });
    rerender({ readLayoutIds: [] });

    expect(dispatch).toHaveBeenCalledTimes(2);
    const again = dispatch.mock.calls[1]?.[0];
    expect(again).toMatchObject({
      type: "values_read",
      layoutId: KINGS_LAYOUT_ID,
    });
    expect(
      again.sources.map((source: ColumnProfile.T) => {
        return [source.columnName, source.values === undefined];
      }),
    ).toEqual([
      ["case_id", false],
      ["GENDER", false],
      ["county", false],
      ["onset_dt", false],
    ]);
    expect(_describeTargets(again.targets)).toHaveLength(4);
    // The datasets and their columns did not change, so the read is reused.
    expect(mocks.profileMock).toHaveBeenCalledTimes(2);

    // Recording the second read stops further dispatches.
    rerender({ readLayoutIds: [KINGS_LAYOUT_ID] });
    rerender({ readLayoutIds: [KINGS_LAYOUT_ID] });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("reads the reference layout like any other, profiling it once", async () => {
    const { result, dispatch } = _renderValues({ layoutId: BRONX_LAYOUT_ID });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(mocks.profileMock).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0]?.[0];
    expect(action).toMatchObject({
      type: "values_read",
      layoutId: BRONX_LAYOUT_ID,
    });
    expect(_describeTargets(action.targets)).toEqual([
      ["case_id", false],
      ["sex", false],
      ["county", false],
      ["rash_onset_date", true],
    ]);
  });

  it("drops a reply for a layout that is no longer selected", async () => {
    const kingsProfiles = Promise.withResolvers<ColumnProfile.T[]>();
    mocks.profileMock.mockImplementation(async (options) => {
      if (options.dataset.id === KINGS_MARCH.id) {
        return kingsProfiles.promise;
      }
      return options.columns.map(
        (column: { name: string; dataType: AvaDataType.T }) => {
          return _profile(options.dataset, column);
        },
      );
    });
    const { result, dispatch, rerender } = _renderValues();

    rerender({ layoutId: BRONX_LAYOUT_ID });
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    kingsProfiles.resolve(
      KINGS_MARCH.columns.map((column) => {
        return _profile(KINGS_MARCH, column);
      }),
    );
    await waitFor(() => {
      expect(mocks.detectMock).toHaveBeenCalled();
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]?.[0]).toMatchObject({
      type: "values_read",
      layoutId: BRONX_LAYOUT_ID,
    });
    expect(result.current.profilesBySourceColumn.has("GENDER")).toBe(false);
  });

  it("dispatches again for a new read of a layout the reducer never recorded", async () => {
    const { result, dispatch, rerender } = _renderValues();
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    // A new column spelling is a new read. readLayoutIds still lacks the
    // layout, as when the reducer recorded and forgot it in one batch.
    const draft = makeMappedDraft();
    rerender({
      draft: {
        ...draft,
        layouts: [
          BRONX_LAYOUT,
          { ...KINGS_LAYOUT, columnNames: ["Case_ID", "GENDER", "county"] },
        ],
      },
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(2);
    });
    expect(result.current.status).toBe("ready");
  });

  it("keeps reading while the layout's dataset is not in the catalog yet", () => {
    const { result } = renderHook(() => {
      return useLayoutValues({
        draft: makeMappedDraft(),
        layoutId: KINGS_LAYOUT_ID,
        readLayoutIds: [],
        context: { ...CONTEXT, datasetsById: new Map() },
        dispatch: vi.fn(),
      });
    });

    expect(result.current.status).toBe("reading");
    expect(mocks.profileMock).not.toHaveBeenCalled();
  });

  it("reports a failed read and dispatches nothing", async () => {
    mocks.profileMock.mockRejectedValue(new Error("no"));
    const { result, dispatch } = _renderValues();

    await waitFor(() => {
      expect(result.current.status).toBe("failed");
    });
    expect(result.current.targets).toEqual([]);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches nothing before the columns are seeded", async () => {
    const { result, dispatch } = _renderValues({
      draft: makeMappedDraft({ columns: [], mappings: {} }),
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("has nothing to read for a reference layout with no dataset", () => {
    const draft = makeMappedDraft({
      layouts: [{ ...BRONX_LAYOUT, datasetIds: [] }, KINGS_LAYOUT],
    });
    const { result } = _renderValues({ layoutId: BRONX_LAYOUT_ID, draft });

    expect(result.current).toEqual({
      status: "ready",
      profilesBySourceColumn: new Map(),
      dateFormatsBySourceColumn: new Map(),
      targets: [],
    });
    expect(mocks.profileMock).not.toHaveBeenCalled();
  });
});

describe("buildLayoutTargets", () => {
  it("finds the reference profile ignoring case and spaces", () => {
    const targets = buildLayoutTargets({
      columns: [{ ...CASE_COLUMN, name: " CASE_ID " }],
      referenceProfiles: [
        _profile(BRONX, { name: "case_id", dataType: "varchar" }),
      ],
      dataset: BRONX,
    });

    expect(targets[0]?.profile.columnName).toBe("case_id");
  });
});
