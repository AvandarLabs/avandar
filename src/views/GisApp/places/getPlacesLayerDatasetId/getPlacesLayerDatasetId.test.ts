import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getPlacesLayerDatasetId } from "@/views/GisApp/places/getPlacesLayerDatasetId/getPlacesLayerDatasetId";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

function _createDataset(): Dataset.T {
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Exposure sites",
    sourceType: "virtual",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

describe("getPlacesLayerDatasetId", () => {
  it("returns the dataset id when the layer reads a places dataset", () => {
    const dataset = _createDataset();
    const layer = MapLayer.fromDataSource({ dataSource: dataset, name: "A" });
    expect(getPlacesLayerDatasetId(layer, new Set([dataset.id]))).toBe(
      dataset.id,
    );
  });

  it("returns undefined for another dataset or no layer", () => {
    const dataset = _createDataset();
    const layer = MapLayer.fromDataSource({ dataSource: dataset, name: "A" });
    expect(getPlacesLayerDatasetId(layer, new Set())).toBeUndefined();
    expect(getPlacesLayerDatasetId(undefined, new Set())).toBeUndefined();
  });
});
