import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getFeatureListAccessFromMapLayer } from "./getFeatureListAccessFromMapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _makePointLayer(): MapLayer.T {
  return {
    ...MapLayer.makeEmpty("Schools"),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

describe("getFeatureListAccessFromMapLayer", () => {
  it("lists every row of an exact point layer", () => {
    expect(getFeatureListAccessFromMapLayer(_makePointLayer())).toBe("rows");
  });

  it("shows only a count for a layer with approximate locations", () => {
    const jittered = MapLayer.withSensitivity(_makePointLayer(), {
      mode: "jitter",
      radiusMeters: 500,
    });

    expect(getFeatureListAccessFromMapLayer(jittered)).toBe("countOnly");
  });

  it("offers no list for an aggregate-only layer", () => {
    const protectedLayer = MapLayer.withSensitivity(_makePointLayer(), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });

    expect(getFeatureListAccessFromMapLayer(protectedLayer)).toBe(
      "unavailable",
    );
  });

  it("offers no list for a buffer layer", () => {
    const buffer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Sites"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: uuid<MapLayer.Id>(),
        distanceMeters: 805,
        distanceUnit: "mi",
        labelColumn: undefined,
        dissolve: false,
      },
    };

    expect(getFeatureListAccessFromMapLayer(buffer)).toBe("unavailable");
  });
});
