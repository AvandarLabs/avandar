import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { createGeometryLayerFixture } from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { compileLatLngLayerSourceSql } from "./compileLatLngLayerSourceSql";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** The geometry fixture rebound as latitude and longitude columns. */
function _createLatLngLayer(): MapLayer.T {
  const { layer } = createGeometryLayerFixture();
  const [latitude, longitude] = layer.source.queryColumns;
  return {
    ...layer,
    sensitivity: { mode: "exact" },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude!.id,
      longitude: longitude!.id,
    },
  };
}

describe("compileLatLngLayerSourceSql", () => {
  it("returns the layer's rows and the names of its coordinate columns", () => {
    const layer = _createLatLngLayer();

    const source = compileLatLngLayerSourceSql({
      layer,
      overlay: { aoi: undefined, timeRange: undefined },
      spatialFilterEnvelopeSql: undefined,
    });

    expect(source).toEqual({
      type: "rows",
      sql: structuredQueryToSql(layer.source),
      latitudeColumnName: 'shape"; DROP TABLE maps; --',
      longitudeColumnName: "label",
    });
  });

  it("returns nothing when a coordinate column is not in the query", () => {
    const layer: MapLayer.T = {
      ..._createLatLngLayer(),
      sensitivity: { mode: "exact" },
      geoBinding: {
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      },
    };

    expect(
      compileLatLngLayerSourceSql({
        layer,
        overlay: { aoi: undefined, timeRange: undefined },
        spatialFilterEnvelopeSql: undefined,
      }),
    ).toBeUndefined();
  });
});
