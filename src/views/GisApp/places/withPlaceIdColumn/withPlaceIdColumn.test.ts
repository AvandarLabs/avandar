import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import { createPlacesLayer } from "@/views/GisApp/places/createPlacesLayer/createPlacesLayer";
import { withPlaceIdColumn } from "@/views/GisApp/places/withPlaceIdColumn/withPlaceIdColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const NOW = "2026-11-09T00:00:00.000Z";
const WORKSPACE_ID = uuid<Workspace.Id>();
const DATASET: Dataset.T = Model.make("Dataset", {
  id: uuid<Dataset.Id>(),
  createdAt: NOW,
  updatedAt: NOW,
  dateOfLastSync: undefined,
  description: undefined,
  isRestricted: false,
  name: "Exposure sites",
  sourceType: "virtual",
  ownerId: uuid<User.Id>(),
  ownerProfileId: uuid<UserProfile.Id>(),
  workspaceId: WORKSPACE_ID,
});
const DATASET_COLUMNS: DatasetColumn.T[] = PLACES_COLUMNS.map(
  (column, columnIdx) => {
    return Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: DATASET.id,
      workspaceId: WORKSPACE_ID,
      createdAt: NOW,
      updatedAt: NOW,
      name: column.name,
      originalName: column.name,
      originalDataType: column.duckDbType,
      dataType: column.dataType,
      detectedDataType: column.duckDbType,
      description: undefined,
      columnIdx,
    });
  },
);
const PLACES_LAYER = createPlacesLayer({
  dataset: DATASET,
  datasetColumns: DATASET_COLUMNS,
});

function _getQueryColumnNames(layer: MapLayer.T): string[] {
  return layer.source.queryColumns.map(QueryColumn.getDerivedColumnName);
}

describe("withPlaceIdColumn", () => {
  it("carries place_id on a places layer's features when the popup omits it", () => {
    const layer = withPlaceIdColumn({
      layer: PLACES_LAYER,
      placesDatasetIds: new Set([DATASET.id]),
      datasetColumns: DATASET_COLUMNS,
    });

    expect(_getQueryColumnNames(layer)).toContain("place_id");
    expect(MapLayer.toPropertyColumnNames(layer)).toContain("place_id");
  });

  it("builds the same place_id column every time, so the layer's query stays cached", () => {
    const options = {
      layer: PLACES_LAYER,
      placesDatasetIds: new Set([DATASET.id]),
      datasetColumns: DATASET_COLUMNS,
    };

    expect(withPlaceIdColumn(options)).toEqual(withPlaceIdColumn(options));
  });

  it("adds no second place_id column to a layer that already queries it", () => {
    const once = withPlaceIdColumn({
      layer: PLACES_LAYER,
      placesDatasetIds: new Set([DATASET.id]),
      datasetColumns: DATASET_COLUMNS,
    });

    const twice = withPlaceIdColumn({
      layer: once,
      placesDatasetIds: new Set([DATASET.id]),
      datasetColumns: DATASET_COLUMNS,
    });

    expect(twice).toBe(once);
  });

  it("leaves a layer over a dataset that is not a places dataset alone", () => {
    const layer = withPlaceIdColumn({
      layer: PLACES_LAYER,
      placesDatasetIds: new Set(),
      datasetColumns: DATASET_COLUMNS,
    });

    expect(layer).toBe(PLACES_LAYER);
  });
});
