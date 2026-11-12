import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { profileDatasetColumns } = await import("./profileDatasetColumns");

const WORKSPACE_ID = uuid<Workspace.Id>();
const DATASET = { id: uuid<Dataset.Id>(), name: "Erie cases" };

describe("profileDatasetColumns", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  it("reads a short column's values with a second query", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        data: [{ row_count: 3n, non_null_0: 3n, distinct_0: 2n }],
      })
      .mockResolvedValueOnce({
        data: [
          { column_index: 0, value: "M", row_count: 2n },
          { column_index: 0, value: "F", row_count: 1n },
        ],
      });
    const [profile] = await profileDatasetColumns({
      workspaceId: WORKSPACE_ID,
      dataset: DATASET,
      columns: [{ name: "sex", dataType: "varchar" }],
    });
    expect(profile?.values).toEqual([
      { value: "M", rowCount: 2 },
      { value: "F", rowCount: 1 },
    ]);
    expect(runQueryMock).toHaveBeenCalledTimes(2);
    expect(runQueryMock.mock.calls[1]?.[0]).toMatchObject({
      workspaceId: WORKSPACE_ID,
    });
  });

  it("skips the values query when no column is short enough", async () => {
    runQueryMock.mockResolvedValueOnce({
      data: [{ row_count: 900n, non_null_0: 900n, distinct_0: 880n }],
    });
    const [profile] = await profileDatasetColumns({
      workspaceId: WORKSPACE_ID,
      dataset: DATASET,
      columns: [{ name: "notes", dataType: "varchar" }],
    });
    expect(profile?.values).toBeUndefined();
    expect(runQueryMock).toHaveBeenCalledTimes(1);
  });

  it("runs nothing for a dataset without columns", async () => {
    await expect(
      profileDatasetColumns({
        workspaceId: WORKSPACE_ID,
        dataset: DATASET,
        columns: [],
      }),
    ).resolves.toEqual([]);
    expect(runQueryMock).not.toHaveBeenCalled();
  });
});
