import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { createVersion6BufferJson } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

function _makeSitesLayer(): MapLayer.T {
  return {
    ...MapLayer.makeEmpty("Sites"),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(
  source: MapLayer.T,
  labelColumn: QueryColumn.Id | undefined,
): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer of Sites"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn,
      dissolve: false,
    },
  };
}

function _makeConfig(layers: readonly MapLayer.T[]): AvaMapConfig.T {
  return { ...AvaMapConfig.makeEmpty(), layers };
}

describe("AvaMapConfigSchema v7 spatial filters", () => {
  it("migrates a version 6 buffer to meters with no ring label", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion6BufferJson());
    const buffer = parsed.layers.find((layer) => {
      return layer.geoBinding?.type === "bufferOfLayer";
    });

    expect(parsed.version).toBe(8);
    expect(buffer?.geoBinding).toMatchObject({
      distanceMeters: 805,
      distanceUnit: "m",
      labelColumn: undefined,
    });
  });

  it("migrates every version 6 layer to no spatial filter", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion6BufferJson());

    expect(
      parsed.layers.map((layer) => {
        return layer.spatialFilter;
      }),
    ).toEqual([undefined, undefined]);
  });

  it("round-trips a spatial filter, a ring label, and a typed unit", () => {
    const sites = _makeSitesLayer();
    const buffer = _makeBufferOf(sites, uuid<QueryColumn.Id>());
    const schools = {
      ..._makeSitesLayer(),
      name: "Schools",
      spatialFilter: { layerId: buffer.id },
    };
    const config = _makeConfig([sites, buffer, schools]);

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("rejects a spatial filter cycle at the json boundary", () => {
    const sites = _makeSitesLayer();
    const buffer = _makeBufferOf(sites, undefined);
    const filteredSites = { ...sites, spatialFilter: { layerId: buffer.id } };
    const json = AvaMapConfigSchema.toJson(
      _makeConfig([filteredSites, buffer]),
    );

    expect(() => {
      return AvaMapConfigSchema.fromJson(json);
    }).toThrow("Spatial filter chain contains a cycle");
  });

  it("keeps a spatial filter whose layer is missing", () => {
    const missingLayerId = uuid<MapLayer.Id>();
    const schools = {
      ..._makeSitesLayer(),
      spatialFilter: { layerId: missingLayerId },
    };
    const parsed = AvaMapConfigSchema.fromJson(
      AvaMapConfigSchema.toJson(_makeConfig([schools])),
    );

    expect(parsed.layers[0]?.spatialFilter).toEqual({
      layerId: missingLayerId,
    });
  });
});
