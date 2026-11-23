import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import { PLACES_DATASET_COLUMNS } from "@/clients/places/places.constants";
import { PlacesNotEditableError } from "@/clients/places/PlacesNotEditableError";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const mocks = vi.hoisted(() => {
  return {
    rpc: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    runQuery: vi.fn(),
  };
});

vi.mock("$/ServerApiClient", () => {
  return {
    createServerApiClient: () => {
      return { rpc: mocks.rpc };
    },
  };
});

vi.mock("$/models/datasets/Dataset/DatasetParsers", () => {
  return {
    DatasetParsers: {
      fromDBReadToModelRead: (row: unknown) => {
        return row;
      },
    },
  };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: { getAll: mocks.getAll, update: mocks.update },
  };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: mocks.runQuery } };
});

const { VirtualPlacesStore } =
  await import("@/clients/places/VirtualPlacesStore/VirtualPlacesStore");

const TARGET = {
  workspaceId: "33333333-3333-4333-8333-333333333333" as Workspace.Id,
  userId: "44444444-4444-4444-8444-444444444444" as User.Id,
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
};

const STORED_SQL = "SELECT * FROM (VALUES ('p1')) AS places(place_id)";

async function readPlacesError(): Promise<unknown> {
  return await VirtualPlacesStore.readPlaces(TARGET).then(
    () => {
      return undefined;
    },
    (error: unknown) => {
      return error;
    },
  );
}

describe("VirtualPlacesStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAll.mockResolvedValue([
      { id: "virtual-row", rawSql: STORED_SQL, isPlaces: true },
    ]);
  });

  it("creates a places dataset with the places columns and no places", async () => {
    mocks.rpc.mockResolvedValue({ id: TARGET.datasetId });
    await VirtualPlacesStore.createPlacesDataset({
      workspaceId: TARGET.workspaceId,
      userId: TARGET.userId,
      datasetName: "Exposure sites",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "rpc_datasets__add_places_dataset",
      expect.objectContaining({
        p_workspace_id: TARGET.workspaceId,
        p_dataset_name: "Exposure sites",
        p_columns: PLACES_DATASET_COLUMNS,
        p_raw_sql: buildPlacesValuesSql([]),
      }),
    );
  });

  it("reads places by running the stored SQL with readable timestamps", async () => {
    mocks.runQuery.mockResolvedValue({ data: [] });
    await VirtualPlacesStore.readPlaces(TARGET);
    expect(mocks.runQuery).toHaveBeenCalledWith({
      workspaceId: TARGET.workspaceId,
      rawSql: expect.stringContaining(`FROM (${STORED_SQL}) AS stored_places`),
    });
  });

  it("rewrites the stored SQL of the dataset's virtual row", async () => {
    await VirtualPlacesStore.writePlaces({ ...TARGET, rows: [] });
    expect(mocks.update).toHaveBeenCalledWith({
      id: "virtual-row",
      data: { rawSql: buildPlacesValuesSql([]) },
    });
  });

  it("refuses to edit a virtual dataset that is not a places dataset", async () => {
    mocks.getAll.mockResolvedValue([
      { id: "virtual-row", rawSql: "SELECT 1", isPlaces: false },
    ]);
    const writing = VirtualPlacesStore.writePlaces({ ...TARGET, rows: [] });
    await expect(writing).rejects.toThrow("is not a places dataset");
    await expect(writing).rejects.toMatchObject({
      reason: "not_places_dataset",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reports rows that are not places as not editable", async () => {
    mocks.runQuery.mockResolvedValue({ data: [{ total: 3 }] });
    const error = await readPlacesError();
    expect(error).toBeInstanceOf(PlacesNotEditableError);
    expect(error).toMatchObject({ reason: "rows_not_places" });
  });

  it("reports stored SQL that lost the places columns as not editable", async () => {
    mocks.runQuery.mockRejectedValue(
      new Error(
        'Binder Error: Referenced column "place_id" not found in FROM clause!',
      ),
    );
    const error = await readPlacesError();
    expect(error).toBeInstanceOf(PlacesNotEditableError);
    expect(error).toMatchObject({ reason: "rows_not_places" });
  });

  it("passes other query failures through unchanged", async () => {
    const networkFailure = new Error("Failed to fetch");
    mocks.runQuery.mockRejectedValue(networkFailure);
    expect(await readPlacesError()).toBe(networkFailure);
  });
});
