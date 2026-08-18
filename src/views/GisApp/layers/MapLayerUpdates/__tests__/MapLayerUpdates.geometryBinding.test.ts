import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import {
  createBoundLayer,
  createNumericColumn,
} from "./MapLayerUpdates.fixtures";

describe("geometry-column updates", () => {
  it("switches from coordinates and selects the required geometry column", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("shape"),
    );
    const updatedLayer = MapLayerUpdates.withGeometryBindingType({
      layer: createBoundLayer(),
      type: "geometryColumn",
      geometryColumn: geometry,
    });

    expect(updatedLayer.geoBinding).toEqual({
      type: "geometryColumn",
      column: geometry.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    });
    expect(updatedLayer.source.queryColumns).toContain(geometry);
  });

  it("defaults line geometry to simplification and line symbology", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("shape"),
    );
    const pointLayer = MapLayerUpdates.withGeometryBindingType({
      layer: createBoundLayer(),
      type: "geometryColumn",
      geometryColumn: geometry,
    });
    const updatedLayer = MapLayerUpdates.withGeometryFamily({
      layer: pointLayer,
      family: "line",
    });

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "geometryColumn",
      family: "line",
      simplification: { tolerancePixels: 0.75 },
    });
    expect(updatedLayer.symbology.type).toBe("line");
  });

  it("switches polygon geometry to fill and clears it when coordinates return", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("shape"),
    );
    const geometryLayer = MapLayerUpdates.withGeometryFamily({
      layer: MapLayerUpdates.withGeometryBindingType({
        layer: createBoundLayer(),
        type: "geometryColumn",
        geometryColumn: geometry,
      }),
      family: "polygon",
    });
    const updatedLayer = MapLayerUpdates.withGeometryBindingType({
      layer: geometryLayer,
      type: "latLngColumns",
    });

    expect(updatedLayer.geoBinding).toEqual({
      type: "latLngColumns",
      latitude: undefined,
      longitude: undefined,
    });
    expect(updatedLayer.symbology.type).toBe("circle");
  });

  it("preserves identity for unchanged geometry settings", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("shape"),
    );
    const layer = MapLayerUpdates.withGeometryBindingType({
      layer: createBoundLayer(),
      type: "geometryColumn",
      geometryColumn: geometry,
    });

    expect(
      MapLayerUpdates.withGeometryColumn({ layer, column: geometry }),
    ).toBe(layer);
    expect(
      MapLayerUpdates.withGeometryEncoding({ layer, encoding: "wkt" }),
    ).toBe(layer);
    expect(MapLayerUpdates.withGeometryFamily({ layer, family: "point" })).toBe(
      layer,
    );
    expect(
      MapLayerUpdates.withGeometrySimplification({
        layer,
        simplification: undefined,
      }),
    ).toBe(layer);
  });

  it("sets and clears a geometry column source CRS", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("shape"),
    );
    const layer = MapLayerUpdates.withGeometryBindingType({
      layer: createBoundLayer(),
      type: "geometryColumn",
      geometryColumn: geometry,
    });

    const withSourceCrs = MapLayerUpdates.withGeometrySourceCrs({
      layer,
      sourceCrs: 3857,
    });
    const withoutSourceCrs = MapLayerUpdates.withGeometrySourceCrs({
      layer: withSourceCrs,
      sourceCrs: undefined,
    });

    expect(withSourceCrs.geoBinding).toMatchObject({ sourceCrs: 3857 });
    expect(withoutSourceCrs.geoBinding).toMatchObject({
      sourceCrs: undefined,
    });
  });
});

describe("swapLatLngColumns", () => {
  it("swaps latitude and longitude column ids", () => {
    const layer = createBoundLayer();
    const binding = layer.geoBinding;
    if (binding?.type !== "latLngColumns") {
      throw new Error("Expected latitude and longitude columns");
    }

    const updated = MapLayerUpdates.swapLatLngColumns(layer);

    expect(updated.geoBinding).toMatchObject({
      type: "latLngColumns",
      latitude: binding.longitude,
      longitude: binding.latitude,
    });
  });

  it("does not swap incomplete latitude and longitude bindings", () => {
    const layer = {
      ...createBoundLayer(),
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: undefined,
        longitude: undefined,
      },
    };

    expect(MapLayerUpdates.swapLatLngColumns(layer)).toBe(layer);
  });

  it("preserves identity when swapping would not change the binding", () => {
    const layer = createBoundLayer();
    const binding = layer.geoBinding;
    if (binding?.type !== "latLngColumns" || !binding.latitude) {
      throw new Error("Expected latitude and longitude columns");
    }
    const sameColumnLayer = {
      ...layer,
      geoBinding: { ...binding, longitude: binding.latitude },
    };

    expect(MapLayerUpdates.swapLatLngColumns(sameColumnLayer)).toBe(
      sameColumnLayer,
    );
  });
});
