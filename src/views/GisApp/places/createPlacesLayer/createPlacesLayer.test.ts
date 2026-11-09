import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import { createPlacesLayer } from "@/views/GisApp/places/createPlacesLayer/createPlacesLayer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
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

function _createColumns(names: readonly string[]): DatasetColumn.T[] {
  return PLACES_COLUMNS.filter((column) => {
    return names.includes(column.name);
  }).map((column, columnIdx) => {
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
  });
}

function _columnName(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): string | undefined {
  const column = layer.source.queryColumns.find((candidate) => {
    return candidate.id === columnId;
  });
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

const ALL_COLUMNS = _createColumns(
  PLACES_COLUMNS.map((column) => {
    return column.name;
  }),
);

describe("createPlacesLayer", () => {
  it("binds latitude and longitude as a point layer named after the dataset", () => {
    const layer = createPlacesLayer({
      dataset: DATASET,
      datasetColumns: ALL_COLUMNS,
    });
    const binding =
      layer.geoBinding?.type === "latLngColumns" ? layer.geoBinding : undefined;
    expect(layer.name).toBe("Exposure sites");
    expect(_columnName(layer, binding?.latitude)).toBe("latitude");
    expect(_columnName(layer, binding?.longitude)).toBe("longitude");
  });

  it("filters by the exposure start on the map's time slider", () => {
    const layer = createPlacesLayer({
      dataset: DATASET,
      datasetColumns: ALL_COLUMNS,
    });
    expect(_columnName(layer, layer.timeColumn)).toBe("starts_at");
  });

  it("shows every places column but the internal place_id in the popup", () => {
    const layer = createPlacesLayer({
      dataset: DATASET,
      datasetColumns: ALL_COLUMNS,
    });
    const popupIds =
      layer.popup.columnIds === "all" ? [] : layer.popup.columnIds;
    expect(
      popupIds.map((columnId) => {
        return _columnName(layer, columnId);
      }),
    ).toEqual(
      PLACES_COLUMNS.map((column) => {
        return column.name;
      }).filter((name) => {
        return name !== "place_id";
      }),
    );
  });

  it("refuses a dataset without coordinate columns", () => {
    expect(() => {
      return createPlacesLayer({
        dataset: DATASET,
        datasetColumns: _createColumns(["name"]),
      });
    }).toThrow("has no latitude and longitude columns");
  });
});
