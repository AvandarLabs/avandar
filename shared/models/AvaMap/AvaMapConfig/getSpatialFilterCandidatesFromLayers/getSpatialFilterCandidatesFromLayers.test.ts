import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { getSpatialFilterCandidatesFromLayers } from "$/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers/getSpatialFilterCandidatesFromLayers.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

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

describe("getSpatialFilterCandidatesFromLayers", () => {
  it("offers only other layers that output polygons", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");

    const candidates = getSpatialFilterCandidatesFromLayers({
      layers: [sites, buffer, schools],
      layerId: schools.id,
    });

    expect(candidates.map(prop("name"))).toEqual(["Buffer of Sites"]);
  });

  it("leaves out a buffer of the layer itself", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);

    const candidates = getSpatialFilterCandidatesFromLayers({
      layers: [sites, buffer],
      layerId: sites.id,
    });

    expect(candidates).toEqual([]);
  });

  it("leaves out a buffer of a displaced point layer", () => {
    const exactSites = _makePointLayer("Exact sites");
    const jitterSites: MapLayer.T = {
      ..._makePointLayer("Jitter sites"),
      sensitivity: { mode: "jitter", radiusMeters: 500 },
    };
    const exactBuffer = _makeBufferOf(exactSites);
    const jitterBuffer = _makeBufferOf(jitterSites);
    const chainedBuffer = _makeBufferOf(jitterBuffer);
    const schools = _makePointLayer("Schools");

    const candidates = getSpatialFilterCandidatesFromLayers({
      layers: [
        exactSites,
        jitterSites,
        exactBuffer,
        jitterBuffer,
        chainedBuffer,
        schools,
      ],
      layerId: schools.id,
    });

    expect(candidates.map(prop("name"))).toEqual(["Buffer of Exact sites"]);
  });
});
