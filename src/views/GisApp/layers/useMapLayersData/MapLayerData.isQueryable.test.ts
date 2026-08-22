import { describe, expect, it } from "vitest";

import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import {
  createDataset,
  createGridBinLayer,
  createQueryableLayer,
  createSpatialLayer,
} from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";

const { MapLayerData } =
  await import("@/views/GisApp/layers/useMapLayersData/MapLayerData");

describe("MapLayerData.isQueryable", () => {
  it("is true for a layer with a source and a resolvable binding", () => {
    expect(MapLayerData.isQueryable(createQueryableLayer())).toBe(true);
  });

  it("is false until the layer has a data source", () => {
    expect(MapLayerData.isQueryable(MapLayer.makeEmpty("Cases"))).toBe(false);
  });

  it("is false when the layer has a source but no resolvable geo binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withSource: MapLayer.T = {
      ...layer,
      source: { ...layer.source, dataSource: createDataset() },
    };
    expect(MapLayerData.isQueryable(withSource)).toBe(false);
  });

  it("is true for a grid bin bound to both coordinate columns", () => {
    const base = createQueryableLayer();
    const [latitude, longitude] = base.source.queryColumns;
    const layer = createGridBinLayer(base, {
      type: "latLngColumns",
      latitude: latitude?.id,
      longitude: longitude?.id,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(true);
  });

  it("is false for a grid bin missing one coordinate column", () => {
    const base = createQueryableLayer();
    const layer = createGridBinLayer(base, {
      type: "latLngColumns",
      latitude: base.source.queryColumns[0]?.id,
      longitude: undefined,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(false);
  });

  it("is true for a grid bin bound to a point geometry column", () => {
    const base = createSpatialLayer();
    const layer = createGridBinLayer(base, {
      type: "geometryColumn",
      column: base.source.queryColumns[0]!.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(true);
  });

  it("is false for a grid bin whose point geometry column is gone", () => {
    const layer = createGridBinLayer(createSpatialLayer(), {
      type: "geometryColumn",
      column: uuid<QueryColumn.Id>(),
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(false);
  });

  it("is true for a bufferOfLayer when the source id exists on the stack", () => {
    const source = createSpatialLayer();
    const buffer = MapLayer.withSensitivity(
      {
        ...MapLayer.createArea("Buffer"),
        geoBinding: {
          type: "bufferOfLayer",
          layerId: source.id,
          distanceMeters: 1000,
          dissolve: false,
        },
      },
      source.sensitivity,
    );

    expect(MapLayerData.isQueryable(buffer, [source, buffer])).toBe(true);
  });

  it("is false for a bufferOfLayer when the source id is missing from the stack", () => {
    const source = createSpatialLayer();
    const buffer = MapLayer.withSensitivity(
      {
        ...MapLayer.createArea("Buffer"),
        geoBinding: {
          type: "bufferOfLayer",
          layerId: source.id,
          distanceMeters: 1000,
          dissolve: false,
        },
      },
      source.sensitivity,
    );

    expect(MapLayerData.isQueryable(buffer, [buffer])).toBe(false);
  });
});
