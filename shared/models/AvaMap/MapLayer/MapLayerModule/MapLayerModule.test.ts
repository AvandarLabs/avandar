import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { describe, expect, it } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

/** An honest `DatasetColumn`, built through `Model.make` with no cast. */
function _createNumericColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "DOUBLE",
    dataType: "double",
    detectedDataType: "DOUBLE",
    isDataTypeUserSet: false,
    description: undefined,
    columnIdx: 0,
  });
}

describe("MapLayer.makeEmpty", () => {
  it("is visible, unbound, and exact by default", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(layer.isVisible).toBe(true);
    expect(layer.geoBinding).toBeUndefined();
    expect(layer.sensitivity).toEqual({ mode: "exact" });
    expect(layer.symbology.type).toBe("circle");
  });
});

describe("MapLayer.toGeoBinding", () => {
  it("returns undefined when the layer has no binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("maps column ids to the names rows are keyed by", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lon"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      source: {
        ...MapLayer.makeEmpty("Cases").source,
        queryColumns: [latitude, longitude],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: longitude.id,
      },
    };

    expect(MapLayer.toGeoBinding(layer)).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
    });
  });

  it("returns undefined when a bound column is not in the query", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: latitude.id,
      },
    };
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("returns undefined when only latitude is set", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      source: {
        ...MapLayer.makeEmpty("Cases").source,
        queryColumns: [latitude],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: undefined,
      },
    };
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("returns undefined when only longitude is set", () => {
    const longitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lon"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      source: {
        ...MapLayer.makeEmpty("Cases").source,
        queryColumns: [longitude],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: undefined,
        longitude: longitude.id,
      },
    };
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("starts resolving only once the second axis is added", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lon"),
    );
    const emptyLayer = MapLayer.makeEmpty("Cases");
    const withLatitudeOnly = {
      ...emptyLayer,
      source: { ...emptyLayer.source, queryColumns: [latitude] },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: undefined,
      },
    };
    expect(MapLayer.toGeoBinding(withLatitudeOnly)).toBeUndefined();

    const withBothAxes = {
      ...withLatitudeOnly,
      source: {
        ...withLatitudeOnly.source,
        queryColumns: [latitude, longitude],
      },
      geoBinding: {
        ...withLatitudeOnly.geoBinding,
        longitude: longitude.id,
      },
    };
    expect(MapLayer.toGeoBinding(withBothAxes)).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
    });
  });
});
