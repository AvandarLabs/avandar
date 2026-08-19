import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { getResolvedMapLayerMetadata } from "../getResolvedMapLayerMetadata";
import {
  createColumn,
  createDataset,
  createGridBinLayer,
  createResolvedFixture,
} from "./getResolvedMapLayerMetadata.fixtures";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

describe("getResolvedMapLayerMetadata", () => {
  it("resolves stable boundary column ids to their current names", () => {
    const fixture = createResolvedFixture();
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
        fixture.geometryColumn,
        fixture.keyColumn,
      ],
    });

    expect(result).toMatchObject({
      type: "resolved",
      boundary: {
        datasetId: fixture.boundaryDataset.id,
        datasetName: "Boundaries",
        geometryColumnName: 'renamed "geometry"',
        keyColumnName: "pcode",
      },
      aggregationMeasureColumnName: "case_count",
    });
  });

  it("requires a deleted boundary dataset to be rebound", () => {
    const fixture = createResolvedFixture();
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset],
      datasetColumns: [],
    });
    expect(result).toEqual({
      type: "rebindRequired",
      reason: "missingBoundaryDataset",
      referenceId: fixture.boundaryDataset.id,
    });
  });

  it("requires a deleted geometry column to be rebound", () => {
    const fixture = createResolvedFixture();
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [fixture.keyColumn],
    });
    expect(result).toEqual({
      type: "rebindRequired",
      reason: "missingBoundaryGeometryColumn",
      referenceId: fixture.geometryColumn.id,
    });
  });

  it("rejects a nonnumeric aggregation measure", () => {
    const fixture = createResolvedFixture("varchar");
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.geometryColumn,
        fixture.keyColumn,
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
      ],
    });
    expect(result).toEqual({
      type: "rebindRequired",
      reason: "aggregationMeasureNotNumeric",
      referenceId: fixture.measureDatasetColumn.id,
    });
  });

  it("requires a deleted boundary join key to be rebound", () => {
    const fixture = createResolvedFixture();
    const binding = fixture.layer.geoBinding;
    if (binding?.type !== "joinToBoundaries") {
      throw new Error("Expected a boundary join fixture");
    }
    const layer: MapLayer.T = {
      ...fixture.layer,
      source: {
        ...fixture.layer.source,
        queryColumns: fixture.layer.source.queryColumns.filter((column) => {
          return column.id !== binding.dataKeyColumn;
        }),
      },
    };

    const result = getResolvedMapLayerMetadata({
      layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.geometryColumn,
        fixture.keyColumn,
        fixture.measureDatasetColumn,
      ],
    });

    expect(result).toEqual({
      type: "rebindRequired",
      reason: "missingSourceColumn",
      referenceId: binding.dataKeyColumn,
    });
  });

  it("resolves a grid bin aggregation measure without a boundary", () => {
    const sourceDataset = createDataset("Cases");
    const pointsColumn = createColumn({
      dataset: sourceDataset,
      name: "location",
    });
    const measureDatasetColumn = createColumn({
      dataset: sourceDataset,
      name: "case_count",
      dataType: "double",
    });
    const layer = createGridBinLayer({
      sourceDataset,
      points: QueryColumn.makeFromDatasetColumn(pointsColumn),
      measureColumn: QueryColumn.makeFromDatasetColumn(measureDatasetColumn),
    });

    expect(
      getResolvedMapLayerMetadata({
        layer,
        datasets: [sourceDataset],
        datasetColumns: [pointsColumn, measureDatasetColumn],
      }),
    ).toMatchObject({
      type: "resolved",
      boundary: undefined,
      aggregationMeasureColumnName: "case_count",
    });
  });

  it("requires a grid bin with a boundary denominator to be rebound", () => {
    const sourceDataset = createDataset("Cases");
    const pointsColumn = createColumn({
      dataset: sourceDataset,
      name: "location",
    });
    const measureDatasetColumn = createColumn({
      dataset: sourceDataset,
      name: "case_count",
      dataType: "double",
    });
    const denominatorColumnId = uuid<DatasetColumn.Id>();
    const measureColumn =
      QueryColumn.makeFromDatasetColumn(measureDatasetColumn);
    const binLayer = createGridBinLayer({
      sourceDataset,
      points: QueryColumn.makeFromDatasetColumn(pointsColumn),
      measureColumn,
    });
    const layer: MapLayer.T = {
      ...binLayer,
      symbology: {
        type: "fill",
        opacity: 0.65,
        stroke: { color: "#1864ab", width: 1 },
        color: {
          type: "graduated",
          value: { type: "queryColumn", column: measureColumn.id },
          ramp: ["#f1f5f9", "#1d4ed8"],
          classification: { method: "quantile", classCount: 5 },
          normalization: {
            denominator: {
              type: "boundaryColumn",
              column: denominatorColumnId,
            },
            multiplier: 1,
          },
          noData: { color: "#e5e7eb", label: "No data" },
        },
      },
    };

    expect(
      getResolvedMapLayerMetadata({
        layer,
        datasets: [sourceDataset],
        datasetColumns: [pointsColumn, measureDatasetColumn],
      }),
    ).toEqual({
      type: "rebindRequired",
      reason: "unsupportedNormalizationDenominator",
      referenceId: denominatorColumnId,
    });
  });

  it("requires a deleted direct geometry column to be rebound", () => {
    const sourceDataset = createDataset("Geometry");
    const missingColumnId = uuid<QueryColumn.Id>();
    const areaLayer = MapLayer.createArea("Areas");
    const layer: MapLayer.T = {
      ...areaLayer,
      source: { ...areaLayer.source, dataSource: sourceDataset },
      geoBinding: {
        type: "geometryColumn",
        column: missingColumnId,
        encoding: "wkt",
        family: "polygon",
        simplification: { tolerancePixels: 0.75 },
        sourceCrs: undefined,
      },
    };

    expect(
      getResolvedMapLayerMetadata({
        layer,
        datasets: [sourceDataset],
        datasetColumns: [],
      }),
    ).toEqual({
      type: "rebindRequired",
      reason: "missingSourceColumn",
      referenceId: missingColumnId,
    });
  });
});
