import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectDateFormats } from "@/lib/crosswalks/detectDateFormats/detectDateFormats";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const mocks = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: mocks.runQueryMock } };
});

const WORKSPACE_ID = "workspace-1" as Workspace.Id;
const DATASET_ID = "dataset-1" as Dataset.Id;

describe("detectDateFormats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the dataset's view and returns each column's format", async () => {
    mocks.runQueryMock.mockResolvedValue({
      data: [
        {
          values_0: 10n,
          parsed_0_0: 0n,
          parsed_0_1: 10n,
          parsed_0_2: 10n,
          parsed_0_3: 0n,
          parsed_0_4: 0n,
          parsed_0_5: 0n,
        },
      ],
    });

    const formats = await detectDateFormats({
      workspaceId: WORKSPACE_ID,
      datasetId: DATASET_ID,
      columnNames: ["rash_onset"],
    });

    expect(formats).toEqual(new Map([["rash_onset", "%m/%d/%Y"]]));
    const [call] = mocks.runQueryMock.mock.calls;
    expect(call?.[0].workspaceId).toBe(WORKSPACE_ID);
    expect(call?.[0].neededColumnsByDatasetId).toEqual({
      [DATASET_ID]: ["rash_onset"],
    });
    expect(call?.[0].rawSql).toContain(`FROM "${DATASET_ID}" USING SAMPLE`);
    expect(call?.[0].rawSql).not.toContain("ava_raw_");
  });

  it("runs nothing for no columns", async () => {
    const formats = await detectDateFormats({
      workspaceId: WORKSPACE_ID,
      datasetId: DATASET_ID,
      columnNames: [],
    });

    expect(formats).toEqual(new Map());
    expect(mocks.runQueryMock).not.toHaveBeenCalled();
  });
});
