import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useBoundarySourceOptions } from "./useBoundarySourceOptions";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const clientState = vi.hoisted(() => {
  return {
    datasets: [] as Dataset.T[],
    columns: [] as DatasetColumn.T[],
    isLoadingDatasets: false,
    isLoadingColumns: false,
  };
});

vi.mock("@/clients/datasets/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [clientState.datasets, clientState.isLoadingDatasets];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [clientState.columns, clientState.isLoadingColumns];
      },
    },
  };
});

function _createDataset(workspaceId: Workspace.Id, name: string): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name,
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId,
  });
}

function _createColumn(dataset: Dataset.T, name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  });
}

describe("useBoundarySourceOptions", () => {
  const workspaceId = uuid<Workspace.Id>();

  beforeEach(() => {
    clientState.datasets = [];
    clientState.columns = [];
    clientState.isLoadingDatasets = false;
    clientState.isLoadingColumns = false;
  });

  it("groups boundary columns under workspace dataset labels", () => {
    const districts = _createDataset(workspaceId, "District boundaries");
    const outside = _createDataset(uuid<Workspace.Id>(), "Other workspace");
    const geometry = _createColumn(districts, "geometry");
    const key = _createColumn(districts, "pcode");
    clientState.datasets = [districts, outside];
    clientState.columns = [geometry, key, _createColumn(outside, "shape")];

    const { result } = renderHook(() => {
      return useBoundarySourceOptions(workspaceId);
    });

    expect(result.current.options).toEqual([
      {
        dataset: districts,
        label: "District boundaries",
        columns: [geometry, key],
      },
    ]);
  });

  it("reports loading and omits datasets whose columns are missing", () => {
    clientState.datasets = [_createDataset(workspaceId, "Incomplete")];
    clientState.isLoadingColumns = true;

    const { result } = renderHook(() => {
      return useBoundarySourceOptions(workspaceId);
    });

    expect(result.current).toEqual({ options: [], isLoading: true });
  });
});
