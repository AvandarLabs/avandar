/**
 * Point-in-polygon aggregation compilation for compileMapLayerSpatialQuery.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery";
import {
  createGeometryLayerFixture,
  getParsedPointsSql,
  withAoiOverlay,
} from "./compileMapLayerSpatialQuery.fixtures";
import type { ResolvedMapLayerMetadata } from "../../MapLayerSpatialQuery.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

describe("compileMapLayerSpatialQuery point aggregation", () => {
  it("compiles point-in-polygon assignment with query-level suppression", () => {
    const fixture = createGeometryLayerFixture();
    const pointColumn = fixture.layer.source.queryColumns[0]!;
    const boundaryDatasetId = uuid<Dataset.Id>();
    const layer = {
      ...fixture.layer,
      sensitivity: {
        mode: "aggregateOnly" as const,
        minCellCount: 5,
        minGeoLevel: "district",
      },
      geoBinding: {
        type: "aggregatePointsToBoundaries" as const,
        points: {
          type: "geometryColumn" as const,
          column: pointColumn.id,
          encoding: "wkt" as const,
          family: "point" as const,
          simplification: undefined,
          sourceCrs: 3857,
        },
        aggregation: {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt" as const,
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
      symbology: MapLayer.createDefaultFillSymbology(),
    } as MapLayer.T;
    const metadata: ResolvedMapLayerMetadata = {
      ...fixture.metadata,
      boundary: {
        datasetId: boundaryDatasetId,
        datasetName: "Boundaries",
        geometryColumnName: "shape",
        geometryEncoding: "wkt",
        keyColumnName: "pcode",
        displayNameColumnName: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    };

    const { rawSql } = compileMapLayerSpatialQuery({
      layer,
      metadata,
      zoomBand: 4,
      simplificationReferenceLatitude: 0,
      overlay: { aoi: undefined, timeRange: undefined },
      stack: [layer],
    });

    expect(rawSql).toContain("ST_Within");
    expect(rawSql).toContain("TRY(ST_Transform(TRY(ST_GeomFromText");
    expect(rawSql).toContain("'EPSG:3857'");
    expect(rawSql).toContain("point_match_counts AS (");
    expect(rawSql).toContain("outside_boundary_count");
    expect(rawSql).toContain("overlap_count");
    expect(rawSql).toContain("contributor_count < 5");
    expect(rawSql).toContain("THEN 'suppressed'");
    expect(rawSql).toContain("THEN NULL");
    expect(rawSql).toContain(
      "CASE WHEN state = 'suppressed' THEN json_object(",
    );
    expect(rawSql).not.toContain(
      "CASE WHEN state = 'suppressed' THEN NULL ELSE contributor_count END",
    );
    expect(rawSql).not.toContain("unmatchedSourceKeySamples");
  });

  it("puts the boundary key on each aggregated feature", () => {
    const fixture = createGeometryLayerFixture();
    const pointColumn = fixture.layer.source.queryColumns[0]!;
    const boundaryDatasetId = uuid<Dataset.Id>();
    const layer = {
      ...fixture.layer,
      geoBinding: {
        type: "aggregatePointsToBoundaries" as const,
        points: {
          type: "geometryColumn" as const,
          column: pointColumn.id,
          encoding: "wkt" as const,
          family: "point" as const,
          simplification: undefined,
          sourceCrs: undefined,
        },
        aggregation: {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt" as const,
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
      symbology: MapLayer.createDefaultFillSymbology(),
    } as MapLayer.T;
    const metadata: ResolvedMapLayerMetadata = {
      ...fixture.metadata,
      boundary: {
        datasetId: boundaryDatasetId,
        datasetName: "Boundaries",
        geometryColumnName: "shape",
        geometryEncoding: "wkt",
        keyColumnName: "pcode",
        displayNameColumnName: "district",
        simplification: { tolerancePixels: 0.75 },
      },
    };

    const { rawSql } = compileMapLayerSpatialQuery({
      layer,
      metadata,
      zoomBand: 4,
      simplificationReferenceLatitude: 0,
      overlay: { aoi: undefined, timeRange: undefined },
      stack: [layer],
    });

    expect(rawSql).toContain('"pcode" AS boundary_key');
    expect(rawSql).toContain("'__avandar_boundary_key', boundary_key");
  });

  it("applies a time between before parsed_points", () => {
    const fixture = createGeometryLayerFixture();
    const pointColumn = fixture.layer.source.queryColumns[0]!;
    const timeColumn = fixture.layer.source.queryColumns[1]!;
    const boundaryDatasetId = uuid<Dataset.Id>();
    const layer = {
      ...fixture.layer,
      timeColumn: timeColumn.id,
      sensitivity: {
        mode: "aggregateOnly" as const,
        minCellCount: 5,
        minGeoLevel: "district",
      },
      geoBinding: {
        type: "aggregatePointsToBoundaries" as const,
        points: {
          type: "geometryColumn" as const,
          column: pointColumn.id,
          encoding: "wkt" as const,
          family: "point" as const,
          simplification: undefined,
          sourceCrs: 3857,
        },
        aggregation: {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt" as const,
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
      symbology: MapLayer.createDefaultFillSymbology(),
    } as MapLayer.T;
    const metadata: ResolvedMapLayerMetadata = {
      ...fixture.metadata,
      boundary: {
        datasetId: boundaryDatasetId,
        datasetName: "Boundaries",
        geometryColumnName: "shape",
        geometryEncoding: "wkt",
        keyColumnName: "pcode",
        displayNameColumnName: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    };

    const { rawSql } = compileMapLayerSpatialQuery({
      layer,
      metadata,
      zoomBand: 4,
      simplificationReferenceLatitude: 0,
      overlay: {
        aoi: undefined,
        timeRange: {
          start: "2026-01-01T00:00:00.000Z",
          end: "2026-01-31T23:59:59.000Z",
        },
      },
      stack: [layer],
    });

    const betweenIndex = rawSql.indexOf("BETWEEN");
    const parsedPointsIndex = rawSql.indexOf("parsed_points");
    expect(betweenIndex).toBeGreaterThanOrEqual(0);
    expect(parsedPointsIndex).toBeGreaterThan(betweenIndex);
  });

  it("intersects point_geometry with the aoi before the aggregate cte", () => {
    const fixture = createGeometryLayerFixture();
    const pointColumn = fixture.layer.source.queryColumns[0]!;
    const boundaryDatasetId = uuid<Dataset.Id>();
    const layer = {
      ...fixture.layer,
      sensitivity: {
        mode: "aggregateOnly" as const,
        minCellCount: 5,
        minGeoLevel: "district",
      },
      geoBinding: {
        type: "aggregatePointsToBoundaries" as const,
        points: {
          type: "geometryColumn" as const,
          column: pointColumn.id,
          encoding: "wkt" as const,
          family: "point" as const,
          simplification: undefined,
          sourceCrs: 3857,
        },
        aggregation: {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt" as const,
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
      symbology: MapLayer.createDefaultFillSymbology(),
    } as MapLayer.T;
    const metadata: ResolvedMapLayerMetadata = {
      ...fixture.metadata,
      boundary: {
        datasetId: boundaryDatasetId,
        datasetName: "Boundaries",
        geometryColumnName: "shape",
        geometryEncoding: "wkt",
        keyColumnName: "pcode",
        displayNameColumnName: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    };

    const { rawSql } = compileMapLayerSpatialQuery({
      layer,
      metadata,
      zoomBand: 4,
      simplificationReferenceLatitude: 0,
      overlay: {
        aoi: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        timeRange: undefined,
      },
      stack: [layer],
    });

    const pointIntersectIndex = rawSql.search(
      /ST_Intersects\s*\(\s*point_geometry/,
    );
    const areaValuesIndex = rawSql.indexOf("area_values AS (");
    expect(pointIntersectIndex).toBeGreaterThanOrEqual(0);
    expect(areaValuesIndex).toBeGreaterThan(pointIntersectIndex);
    expect(rawSql).toContain('ST_Intersects("__avandar_geometry"');
  });

  it("counts invalid points from parsed_points without aoi-filtering the parse cte", () => {
    const fixture = createGeometryLayerFixture();
    const pointColumn = fixture.layer.source.queryColumns[0]!;
    const boundaryDatasetId = uuid<Dataset.Id>();
    const layer = {
      ...fixture.layer,
      sensitivity: {
        mode: "aggregateOnly" as const,
        minCellCount: 5,
        minGeoLevel: "district",
      },
      geoBinding: {
        type: "aggregatePointsToBoundaries" as const,
        points: {
          type: "geometryColumn" as const,
          column: pointColumn.id,
          encoding: "wkt" as const,
          family: "point" as const,
          simplification: undefined,
          sourceCrs: 3857,
        },
        aggregation: {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt" as const,
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
      symbology: MapLayer.createDefaultFillSymbology(),
    } as MapLayer.T;
    const metadata: ResolvedMapLayerMetadata = {
      ...fixture.metadata,
      boundary: {
        datasetId: boundaryDatasetId,
        datasetName: "Boundaries",
        geometryColumnName: "shape",
        geometryEncoding: "wkt",
        keyColumnName: "pcode",
        displayNameColumnName: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    };

    const { rawSql } = compileMapLayerSpatialQuery(
      withAoiOverlay({
        layer,
        metadata,
        zoomBand: 4,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(getParsedPointsSql(rawSql)).not.toContain("ST_Intersects");
    expect(rawSql).toContain(
      "count(*) FILTER (WHERE point_geometry IS NULL) AS invalid_count",
    );
    const diagnosticSql = rawSql.slice(
      rawSql.indexOf("diagnostic_summary AS ("),
    );
    expect(diagnosticSql).toContain("FROM parsed_points");
    const candidatesSql = rawSql.slice(
      rawSql.indexOf("point_boundary_candidates AS ("),
      rawSql.indexOf("point_match_counts AS ("),
    );
    expect(candidatesSql).toContain("ST_Intersects");
  });
});
