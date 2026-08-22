import { describe, expect, it } from "vitest";

import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

import {
  createBoundLayer,
  createDataset,
  createNumericColumn,
  createTextColumn,
} from "./MapLayerUpdates.fixtures";

describe("boundary join updates", () => {
  it("creates a complete join and selects its source key", () => {
    const dataKeyColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("district"),
    );
    const boundaryDataset = createDataset();
    const geometryColumn = createNumericColumn("shape");
    const boundaryKeyColumn = createNumericColumn("pcode");
    const updatedLayer = MapLayerUpdates.withBoundaryJoin({
      layer: MapLayer.makeEmpty("Districts"),
      dataKeyColumn,
      matching: "exact",
      boundary: {
        datasetId: boundaryDataset.id,
        geometryColumnId: geometryColumn.id,
        geometryEncoding: "wkt",
        keyColumnId: boundaryKeyColumn.id,
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    });

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "joinToBoundaries",
      dataKeyColumn: dataKeyColumn.id,
      matching: "exact",
      aggregation: { operation: "count" },
    });
    expect(updatedLayer.source.queryColumns).toContain(dataKeyColumn);
    expect(updatedLayer.symbology.type).toBe("fill");
  });

  it("preserves aggregation identity when operation and measure change", () => {
    const dataKeyColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("district"),
    );
    const measureColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const boundaryDataset = createDataset();
    const joined = MapLayerUpdates.withBoundaryJoin({
      layer: MapLayer.makeEmpty("Districts"),
      dataKeyColumn,
      matching: "exact",
      boundary: {
        datasetId: boundaryDataset.id,
        geometryColumnId: createNumericColumn("shape").id,
        geometryEncoding: "wkt",
        keyColumnId: createNumericColumn("pcode").id,
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    });
    const originalBinding = joined.geoBinding;
    if (originalBinding?.type !== "joinToBoundaries") {
      throw new Error("Expected a boundary join");
    }
    const updatedLayer = MapLayerUpdates.withAreaAggregation({
      layer: joined,
      operation: "sum",
      measureColumn,
    });

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "joinToBoundaries",
      aggregation: {
        operation: "sum",
        measureColumn: measureColumn.id,
        outputValueId: originalBinding.aggregation.outputValueId,
      },
    });
    expect(updatedLayer.source.queryColumns).toContain(measureColumn);
  });
});

describe("grid-bin updates", () => {
  it("copies coordinate points and starts a default hex count bin", () => {
    const layer = createBoundLayer();

    const updatedLayer = MapLayerUpdates.withGridBin(layer);

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: MapLayer.defaultGridSizeMeters,
      points: layer.geoBinding,
      aggregation: { operation: "count" },
    });
    expect(updatedLayer.symbology.type).toBe("fill");
  });

  it("keeps an aggregate-only layer when selecting a grid bin", () => {
    const layer = MapLayer.withSensitivity(MapLayer.createArea("Cases"), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "hex",
    });

    const updatedLayer = MapLayerUpdates.withGridBin(layer);

    expect(updatedLayer.sensitivity.mode).toBe("aggregateOnly");
    expect(updatedLayer.geoBinding?.type).toBe("binPointsToGrid");
    expect(updatedLayer.symbology.type).toBe("fill");
  });

  it("copies a point geometry column into the grid source", () => {
    const geometryColumn = QueryColumn.makeFromDatasetColumn(
      createTextColumn("geometry"),
    );
    const layer = {
      ...createBoundLayer(),
      geoBinding: {
        type: "geometryColumn" as const,
        column: geometryColumn.id,
        encoding: "wkt" as const,
        family: "point" as const,
        simplification: undefined,
        sourceCrs: undefined,
      },
    };

    const updatedLayer = MapLayerUpdates.withGridBin(layer);

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "binPointsToGrid",
      points: layer.geoBinding,
    });
  });

  it("switches a grid bin from hexagons to squares", () => {
    const layer = MapLayerUpdates.withGridBin(createBoundLayer());

    const updatedLayer = MapLayerUpdates.withGridType({
      layer,
      grid: "square",
    });

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "binPointsToGrid",
      grid: "square",
    });
  });

  it.each([
    { sizeMeters: 50, expected: 100 },
    { sizeMeters: 2_000_000, expected: 1_000_000 },
  ])(
    "clamps $sizeMeters meter cells to $expected",
    ({ sizeMeters, expected }) => {
      const layer = MapLayerUpdates.withGridBin(createBoundLayer());

      const updatedLayer = MapLayerUpdates.withGridSizeMeters({
        layer,
        sizeMeters,
      });

      expect(updatedLayer.geoBinding).toMatchObject({
        type: "binPointsToGrid",
        sizeMeters: expected,
      });
    },
  );

  it("keeps a non-count grid measure column when deselected from popup", () => {
    const measureColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const gridLayer = MapLayerUpdates.withGridBin(createBoundLayer());
    const aggregatedLayer = MapLayerUpdates.withAreaAggregation({
      layer: gridLayer,
      operation: "sum",
      measureColumn,
    });

    const updatedLayer = MapLayerUpdates.withPopupColumns({
      layer: aggregatedLayer,
      columns: [],
    });

    expect(updatedLayer.source.queryColumns).toContain(measureColumn);
  });
});
