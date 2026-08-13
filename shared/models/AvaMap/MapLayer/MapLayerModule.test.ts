import { uuid } from "$/lib/uuid.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { describe, expect, it } from "vitest";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

function createNumericColumn(name: string): DatasetColumnRead {
  const now = new Date().toISOString();
  return {
    __type: "DatasetColumn",
    id: uuid<DatasetColumnId>(),
    datasetId: uuid<DatasetId>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "DOUBLE",
    dataType: "double",
    detectedDataType: "DOUBLE",
    description: undefined,
    columnIdx: 0,
  };
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

describe("MapLayer.resolveGeoBinding", () => {
  it("returns undefined when the layer has no binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(MapLayer.resolveGeoBinding(layer)).toBeUndefined();
  });

  it("maps column ids to the names rows are keyed by", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lon"),
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

    expect(MapLayer.resolveGeoBinding(layer)).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
    });
  });

  it("returns undefined when a bound column is not in the query", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lat"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: latitude.id,
      },
    };
    expect(MapLayer.resolveGeoBinding(layer)).toBeUndefined();
  });

  it("returns undefined when only latitude is set", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lat"),
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
    expect(MapLayer.resolveGeoBinding(layer)).toBeUndefined();
  });

  it("returns undefined when only longitude is set", () => {
    const longitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lon"),
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
    expect(MapLayer.resolveGeoBinding(layer)).toBeUndefined();
  });

  it("resolves once both axes are set", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lon"),
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
    expect(MapLayer.resolveGeoBinding(layer)).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
    });
  });
});
