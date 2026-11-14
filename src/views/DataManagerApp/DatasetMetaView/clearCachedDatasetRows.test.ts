import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { clearCachedDatasetRows } from "@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const { dropLocalDatasetMock, evictMock, virtualGetAllMock } = vi.hoisted(
  () => {
    return {
      dropLocalDatasetMock: vi.fn(),
      evictMock: vi.fn(),
      virtualGetAllMock: vi.fn(),
    };
  },
);

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return { LocalDatasetClient: { dropLocalDataset: dropLocalDatasetMock } };
});
vi.mock(
  "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache",
  () => {
    return { DexieRelationCache: { evict: evictMock } };
  },
);
vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: virtualGetAllMock };
          },
        };
      },
    },
  };
});

const SHEET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const LINKED_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const OPTIONS = {
  datasetId: SHEET_ID,
  userId: "44444444-4444-4444-8444-444444444444" as User.Id,
  workspaceId: "55555555-5555-4555-8555-555555555555" as Workspace.Id,
};
const PRINCIPAL = makePrincipalKeyFromWorkspaceSession({
  workspaceId: OPTIONS.workspaceId,
  userId: OPTIONS.userId,
});

beforeEach(() => {
  vi.clearAllMocks();
  virtualGetAllMock.mockResolvedValue([]);
});

describe("clearCachedDatasetRows", () => {
  it("clears the linked datasets that read the dataset too", async () => {
    virtualGetAllMock.mockResolvedValue([{ datasetId: LINKED_ID }]);

    await clearCachedDatasetRows(OPTIONS);

    expect(virtualGetAllMock).toHaveBeenCalledWith({
      where: { linked_source_dataset_id: { eq: SHEET_ID } },
    });
    expect(evictMock).toHaveBeenCalledWith(
      [
        { kind: "dataset", id: SHEET_ID },
        { kind: "dataset", id: LINKED_ID },
      ],
      PRINCIPAL,
    );
    expect(dropLocalDatasetMock).toHaveBeenCalledWith({ datasetId: LINKED_ID });
  });

  it("still clears the dataset when its linked datasets cannot be read", async () => {
    virtualGetAllMock.mockRejectedValue(new Error("Failed to fetch"));

    await clearCachedDatasetRows(OPTIONS);

    expect(evictMock).toHaveBeenCalledWith(
      [{ kind: "dataset", id: SHEET_ID }],
      PRINCIPAL,
    );
    expect(dropLocalDatasetMock).toHaveBeenCalledWith({ datasetId: SHEET_ID });
  });
});
