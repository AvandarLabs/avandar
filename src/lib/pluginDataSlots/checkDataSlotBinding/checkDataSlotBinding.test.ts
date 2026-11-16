import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { checkDataSlotBinding } =
  await import("@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding");

const WORKSPACE_ID = "workspace_1" as Workspace.Id;
const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "onset",
  label: "onset",
  dataType: "date",
};

const SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: DATASET_ID,
  name: "line_list.csv",
  fields: [
    ONSET_FIELD,
    {
      id: "col_notes",
      columnName: "notes",
      label: "notes",
      dataType: "varchar",
    },
  ],
};

const SAMPLE_ROWS = [
  { onsetDate: "2026-01-05", district: null },
  { onsetDate: "2026-01-06", district: null },
];

function _mockQueryResults(countsRow: Readonly<Record<string, unknown>>): void {
  runQueryMock.mockImplementation(async (params: { rawSql: string }) => {
    return params.rawSql.startsWith("SELECT count(*)")
      ? { id: "counts", columns: [], data: [countsRow], numRows: 1 }
      : { id: "sample", columns: [], data: SAMPLE_ROWS, numRows: 2 };
  });
}

async function _checkOnsetOnly(): ReturnType<typeof checkDataSlotBinding> {
  return await checkDataSlotBinding({
    workspaceId: WORKSPACE_ID,
    slot: CASES_SLOT,
    source: SOURCE,
    fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
  });
}

describe("checkDataSlotBinding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts the slot's rows and each attribute's filled rows as numbers", async () => {
    _mockQueryResults({
      row_count: 120n,
      filled_count_0: 118n,
      filled_count_1: 0n,
    });

    const result = await _checkOnsetOnly();

    expect(result.rowCount).toBe(120);
    expect(result.filledCountsByAttributeKey).toEqual({
      onsetDate: 118,
      district: 0,
    });
  });

  it("reads counts the engine already returned as numbers", async () => {
    _mockQueryResults({ row_count: 3, filled_count_0: 2, filled_count_1: 0 });

    const result = await _checkOnsetOnly();

    expect(result.rowCount).toBe(3);
    expect(result.filledCountsByAttributeKey.onsetDate).toBe(2);
  });

  it("returns the slot's first rows as samples, from a query of at most 5 rows", async () => {
    _mockQueryResults({
      row_count: 2n,
      filled_count_0: 2n,
      filled_count_1: 0n,
    });

    const result = await _checkOnsetOnly();

    expect(result.sampleRows).toEqual(SAMPLE_ROWS);
    expect(runQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ rawSql: expect.stringMatching(/\nLIMIT 5$/) }),
    );
  });

  it("loads only the dataset columns the binding maps", async () => {
    _mockQueryResults({
      row_count: 2n,
      filled_count_0: 2n,
      filled_count_1: 0n,
    });

    await _checkOnsetOnly();

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset"] },
      }),
    );
  });

  it("names a shared dataset column once when two attributes map to it", async () => {
    _mockQueryResults({
      row_count: 2n,
      filled_count_0: 2n,
      filled_count_1: 2n,
    });

    await checkDataSlotBinding({
      workspaceId: WORKSPACE_ID,
      slot: CASES_SLOT,
      source: SOURCE,
      fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: ONSET_FIELD },
    });

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset"] },
      }),
    );
  });
});
