import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getBufferFilterTargetsFromLayers } from "./getBufferFilterTargetsFromLayers";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _makePointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
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

describe("getBufferFilterTargetsFromLayers", () => {
  it("offers point layers other than the buffer's own source", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");
    const zipCodes = MapLayer.createArea("ZIP codes");

    const targets = getBufferFilterTargetsFromLayers({
      layers: [sites, buffer, schools, zipCodes],
      bufferLayerId: buffer.id,
    });

    expect(targets.map(prop("name"))).toEqual(["Schools"]);
  });

  it("offers nothing until the buffer is on the map", () => {
    expect(
      getBufferFilterTargetsFromLayers({
        layers: [_makePointLayer("Schools")],
        bufferLayerId: uuid<MapLayer.Id>(),
      }),
    ).toEqual([]);
  });
});
