import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVirtualRelationDefinitions,
  makeVirtualRelationDefinition,
} from "@/clients/qetl/QueryMediator/relationLoading/getVirtualRelationDefinitions/getVirtualRelationDefinitions";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const { virtualGetAllMock } = vi.hoisted(() => {
  return { virtualGetAllMock: vi.fn() };
});

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

const LINKED_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const UPLOAD_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getVirtualRelationDefinitions", () => {
  it("reads nothing for no datasets", async () => {
    await expect(getVirtualRelationDefinitions([])).resolves.toEqual({});
    expect(virtualGetAllMock).not.toHaveBeenCalled();
  });

  it("keys each virtual dataset by its SQL and leaves the rest out", async () => {
    virtualGetAllMock.mockResolvedValue([
      { datasetId: LINKED_ID, rawSql: `SELECT * FROM "${UPLOAD_ID}"` },
    ]);

    const definitions = await getVirtualRelationDefinitions([
      LINKED_ID,
      UPLOAD_ID,
    ]);

    expect(definitions).toEqual({
      [LINKED_ID]: {
        kind: "virtual_sql",
        text: `SELECT * FROM "${UPLOAD_ID}"`,
      },
    });
    expect(virtualGetAllMock).toHaveBeenCalledWith({
      where: { dataset_id: { in: [LINKED_ID, UPLOAD_ID] } },
    });
  });

  it("makes the same definition from the same SQL", () => {
    expect(makeVirtualRelationDefinition("SELECT 1")).toEqual({
      kind: "virtual_sql",
      text: "SELECT 1",
    });
  });
});
