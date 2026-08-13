import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";

function createNumericColumn(name: string): DatasetColumnRead {
  return {
    __type: "DatasetColumn",
    id: uuid(),
    datasetId: uuid(),
    name,
    originalName: name,
    dataType: "number",
    detectedDataType: "DOUBLE",
    description: undefined,
    columnIndex: 0,
  } as unknown as DatasetColumnRead;
}

describe("MapLayer.makeEmpty", () => {
  it("is visible, unbound, and exact by default", () => {
    const layer = MapLayer.makeEmpty({ name: "Cases" });
    expect(layer.isVisible).toBe(true);
    expect(layer.geoBinding).toBeUndefined();
    expect(layer.sensitivity).toEqual({ mode: "exact" });
    expect(layer.symbology.type).toBe("circle");
  });
});

describe("MapLayer.resolveGeoBinding", () => {
  it("maps column ids to the names rows are keyed by", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(createNumericColumn("lat"));
    const longitude = QueryColumn.makeFromDatasetColumn(createNumericColumn("lon"));
    const layer = {
      ...MapLayer.makeEmpty({ name: "Cases" }),
      source: {
        ...MapLayer.makeEmpty({ name: "Cases" }).source,
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
    const latitude = QueryColumn.makeFromDatasetColumn(createNumericColumn("lat"));
    const layer = {
      ...MapLayer.makeEmpty({ name: "Cases" }),
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: latitude.id,
      },
    };
    expect(MapLayer.resolveGeoBinding(layer)).toBeUndefined();
  });
});
