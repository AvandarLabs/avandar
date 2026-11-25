import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.ts";
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

function _filteredBy(layer: MapLayer.T, filterLayer: MapLayer.T): MapLayer.T {
  return { ...layer, spatialFilter: { layerId: filterLayer.id } };
}

describe("hasSpatialFilterCycle", () => {
  it("allows schools filtered by a buffer of sites", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _filteredBy(_makePointLayer("Schools"), buffer);

    expect(hasSpatialFilterCycle([sites, buffer, schools], schools.id)).toBe(
      false,
    );
  });

  it("finds a cycle when sites are filtered by their own buffer", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const filteredSites = _filteredBy(sites, buffer);

    expect(hasSpatialFilterCycle([filteredSites, buffer], sites.id)).toBe(true);
  });

  it("finds a cycle when two layers filter each other", () => {
    const first = MapLayer.createArea("First");
    const second = _filteredBy(MapLayer.createArea("Second"), first);
    const filteredFirst = _filteredBy(first, second);

    expect(hasSpatialFilterCycle([filteredFirst, second], first.id)).toBe(true);
  });

  it("finds no cycle when the filtering layer is missing", () => {
    const schools = _filteredBy(
      _makePointLayer("Schools"),
      MapLayer.createArea("Deleted"),
    );

    expect(hasSpatialFilterCycle([schools], schools.id)).toBe(false);
  });
});
