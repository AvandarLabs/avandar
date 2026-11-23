import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getPlacesLayerDatasetIds } from "@/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

function _createDataset(name: string): Dataset.T {
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name,
    sourceType: "virtual",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

describe("getPlacesLayerDatasetIds", () => {
  it("lists each places dataset shown on the map once, in layer order", () => {
    const placesDataset = _createDataset("Exposure sites");
    const otherDataset = _createDataset("Schools");
    const layers = [
      MapLayer.fromDataSource({ dataSource: otherDataset, name: "Schools" }),
      MapLayer.fromDataSource({
        dataSource: placesDataset,
        name: "Exposure sites",
      }),
      MapLayer.fromDataSource({
        dataSource: placesDataset,
        name: "Exposure sites copy",
      }),
      MapLayer.makeEmpty("Empty"),
    ];
    expect(
      getPlacesLayerDatasetIds({
        layers,
        placesDatasetIds: new Set([placesDataset.id]),
      }),
    ).toEqual([placesDataset.id]);
  });
});
