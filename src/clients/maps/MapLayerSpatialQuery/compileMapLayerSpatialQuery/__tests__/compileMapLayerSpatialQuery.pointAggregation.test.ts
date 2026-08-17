/**
 * Point-in-polygon aggregation compilation for compileMapLayerSpatialQuery.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery";
import { createGeometryLayerFixture } from "./compileMapLayerSpatialQuery.fixtures";
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
});
