import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import {
  createVersion1Json,
  createVersion2Json,
  omitExportFields,
  omitOverlayFields,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v4SchemaSuites.ts";
import "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v5SchemaSuites.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { describe, expect, it } from "vitest";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

describe("AvaMapConfigSchema", () => {
  it("migrates an empty version 1 config to the current version", () => {
    expect(AvaMapConfigSchema.fromJson(createVersion1Json())).toEqual({
      ...createVersion1Json(),
      version: 5,
      aoi: undefined,
      timeRange: undefined,
      annotations: { isVisible: true, features: [] },
      annotationsZIndex: 0,
      exportLayout: AvaMapConfig.defaultExportLayout,
    });
  });

  it("adds persisted classification output while migrating a version 1 layer", () => {
    const currentLayer = MapLayer.makeEmpty("Cases");
    const {
      breaks: _breaks,
      entries: _entries,
      sizeStops: _sizeStops,
      ...version1Legend
    } = currentLayer.legend;
    const parsed = AvaMapConfigSchema.fromJson({
      ...createVersion1Json(),
      layers: [
        {
          ...omitOverlayFields(omitExportFields(currentLayer)),
          legend: version1Legend,
        },
      ],
    });

    expect(parsed.version).toBe(5);
    expect(parsed.layers[0]).toMatchObject({
      id: currentLayer.id,
      name: "Cases",
      geoBinding: undefined,
      sensitivity: { mode: "exact" },
      symbology: currentLayer.symbology,
      legend: {
        ...version1Legend,
        breaks: [],
        entries: [],
        sizeStops: [],
      },
    });
  });

  it("keeps a version 1 aggregate-only layer blocked during migration", () => {
    const currentLayer = MapLayer.makeEmpty("Protected cases");
    const {
      breaks: _breaks,
      entries: _entries,
      sizeStops: _sizeStops,
      ...version1Legend
    } = currentLayer.legend;
    const queryColumnId = uuid<QueryColumn.Id>();
    const parsed = AvaMapConfigSchema.fromJson({
      ...createVersion1Json(),
      layers: [
        {
          ...omitOverlayFields(omitExportFields(currentLayer)),
          geoBinding: {
            type: "latLngColumns",
            latitude: queryColumnId,
            longitude: queryColumnId,
          },
          sensitivity: {
            mode: "aggregateOnly",
            minCellCount: 5,
            minGeoLevel: "district",
          },
          legend: version1Legend,
        },
      ],
    });

    expect(parsed.layers[0]?.sensitivity.mode).toBe("aggregateOnly");
    expect(parsed.layers[0]?.geoBinding).toBeUndefined();
    expect(parsed.layers[0]?.symbology.type).toBe("fill");
  });

  it("migrates version 2 without changing wave b symbology", () => {
    const currentLayer = MapLayer.makeEmpty("Cases");
    const { sizeStops: _sizeStops, ...version2Legend } = currentLayer.legend;
    const parsed = AvaMapConfigSchema.fromJson({
      ...createVersion2Json(),
      layers: [
        {
          ...omitOverlayFields(omitExportFields(currentLayer)),
          legend: version2Legend,
        },
      ],
    });

    expect(parsed.version).toBe(5);
    expect(parsed.layers[0]?.legend.sizeStops).toEqual([]);
    expect(parsed.layers[0]?.symbology).toEqual(currentLayer.symbology);
  });

  it("rejects aggregate-only cluster paint at the json boundary", () => {
    const layer = MapLayer.makeEmpty("Protected cases");
    const json = {
      ...(AvaMapConfigSchema.toJson(AvaMapConfig.makeEmpty()) as Record<
        string,
        unknown
      >),
      layers: [
        {
          ...layer,
          sensitivity: {
            mode: "aggregateOnly",
            minCellCount: 5,
            minGeoLevel: "district",
          },
          symbology: {
            type: "cluster",
            radiusPx: 50,
            color: { type: "single", color: "#3b82f6" },
            stroke: { width: 1, color: "#ffffff" },
          },
        },
      ],
    };

    expect(() => {
      return AvaMapConfigSchema.fromJson(json);
    }).toThrow();
  });

  it("round trips a hex-bin layer", () => {
    const queryColumnId = uuid<QueryColumn.Id>();
    const areaLayer = MapLayer.createArea("Hex bins");
    const gridBinLayer = MapLayer.withSensitivity(
      {
        ...areaLayer,
        geoBinding: {
          type: "binPointsToGrid",
          grid: "hex",
          sizeMeters: 10_000,
          points: {
            type: "latLngColumns",
            latitude: queryColumnId,
            longitude: queryColumnId,
          },
          aggregation: {
            operation: "count",
            outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
          },
        },
      },
      { mode: "aggregateOnly", minCellCount: 5, minGeoLevel: "hex" },
    );
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: gridBinLayer,
    });

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("round trips an empty config", () => {
    const config = AvaMapConfig.makeEmpty();
    const parsed = AvaMapConfigSchema.fromJson(
      AvaMapConfigSchema.toJson(config),
    );
    expect(parsed).toEqual(config);
  });

  it("round trips a config carrying a layer and a bookmark", () => {
    const config = AvaMapConfig.withBookmarkAdded({
      config: AvaMapConfig.withLayerAdded({
        config: AvaMapConfig.makeEmpty(),
        layer: MapLayer.makeEmpty("Cases"),
      }),
      bookmark: AvaMapConfig.makeBookmark({
        name: "Goma",
        view: { center: [29.2, -1.7], zoom: 9 },
      }),
    });
    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("rejects a config written by a future version", () => {
    const config = AvaMapConfig.makeEmpty();
    const json = AvaMapConfigSchema.toJson(config) as Record<string, unknown>;
    const future = { ...json, version: 6 };
    expect(() => {
      return AvaMapConfigSchema.fromJson(future);
    }).toThrow();
  });

  it("rejects a layer whose symbology is not a known kind", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: MapLayer.makeEmpty("Cases"),
    });
    const json = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ symbology: { type: string } }>;
    };
    json.layers[0]!.symbology.type = "hexbin";
    expect(() => {
      return AvaMapConfigSchema.fromJson(json);
    }).toThrow();
  });

  it("rejects unknown top-level config fields", () => {
    const config = AvaMapConfig.makeEmpty();
    const serializedJson = AvaMapConfigSchema.toJson(config) as Record<
      string,
      unknown
    >;
    const json = {
      ...serializedJson,
      unexpected: true,
    };
    expect(() => {
      return AvaMapConfigSchema.fromJson(json);
    }).toThrow();
  });

  it("round trips a popup action in serialized config JSON", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: MapLayer.makeEmpty("Cases"),
    });
    const serializedJson = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ popup: Record<string, unknown> }>;
    };
    serializedJson.layers[0]!.popup.action = {
      label: "Open case",
      urlTemplate: "https://example.test/cases/{id}",
    };

    const parsed = AvaMapConfigSchema.fromJson(serializedJson);

    expect(AvaMapConfigSchema.toJson(parsed)).toEqual(serializedJson);
  });

  it("rejects unknown fields inside a popup action", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: MapLayer.makeEmpty("Cases"),
    });
    const serializedJson = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ popup: Record<string, unknown> }>;
    };
    serializedJson.layers[0]!.popup.action = {
      label: "Open case",
      urlTemplate: "https://example.test/cases/{id}",
      unexpected: true,
    };

    expect(() => {
      return AvaMapConfigSchema.fromJson(serializedJson);
    }).toThrow();
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>"])(
    "rejects unsafe popup URL protocol %s",
    (urlTemplate) => {
      const config = AvaMapConfig.withLayerAdded({
        config: AvaMapConfig.makeEmpty(),
        layer: MapLayer.makeEmpty("Cases"),
      });
      const serializedJson = AvaMapConfigSchema.toJson(config) as {
        layers: Array<{ popup: Record<string, unknown> }>;
      };
      serializedJson.layers[0]!.popup.action = {
        label: "Open case",
        urlTemplate,
      };

      expect(() => {
        return AvaMapConfigSchema.fromJson(serializedJson);
      }).toThrow();
    },
  );

  it("rejects unsafe popup URLs before serializing a config", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: {
        ...layer,
        popup: {
          ...layer.popup,
          action: { label: "Open case", urlTemplate: "javascript:alert(1)" },
        },
      },
    });

    expect(() => {
      return AvaMapConfigSchema.toJson(config);
    }).toThrow();
  });

  it("rejects an array as a structured query source", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: MapLayer.makeEmpty("Cases"),
    });
    const serializedJson = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ source: unknown }>;
    };
    serializedJson.layers[0]!.source = [];

    expect(() => {
      return AvaMapConfigSchema.fromJson(serializedJson);
    }).toThrow();
  });

  it("rejects a non-plain object as a structured query source", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: MapLayer.makeEmpty("Cases"),
    });
    const serializedJson = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ source: unknown }>;
    };
    serializedJson.layers[0]!.source = new Date();

    expect(() => {
      return AvaMapConfigSchema.fromJson(serializedJson);
    }).toThrow();
  });

  it("rejects a config that is not an object at all", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(null);
    }).toThrow();
  });
});
