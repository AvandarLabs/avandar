import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createGeometryLayerFixture } from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { getCompileMetadataFromMapLayer } from "./getCompileMetadataFromMapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

describe("getCompileMetadataFromMapLayer", () => {
  it("resolves a buffer against its source layer's columns", () => {
    const { layer: source } = createGeometryLayerFixture();
    const buffer = _makeBufferOf(source);
    const labelColumn = source.source.queryColumns[1]!;

    const metadata = getCompileMetadataFromMapLayer({
      layer: buffer,
      stack: [source, buffer],
      datasets: [],
      datasetColumns: [],
    });

    expect(metadata.sourceColumnNames.get(labelColumn.id)).toBe("label");
  });

  it("throws when a bound column is no longer in the layer's query", () => {
    const { layer } = createGeometryLayerFixture();
    const unbound: MapLayer.T = {
      ...MapLayer.makeEmpty("Unbound"),
      source: layer.source,
      geoBinding: {
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      },
    };

    expect(() => {
      return getCompileMetadataFromMapLayer({
        layer: unbound,
        stack: [unbound],
        datasets: [],
        datasetColumns: [],
      });
    }).toThrow("Map geometry requires rebinding: missingSourceColumn");
  });
});
