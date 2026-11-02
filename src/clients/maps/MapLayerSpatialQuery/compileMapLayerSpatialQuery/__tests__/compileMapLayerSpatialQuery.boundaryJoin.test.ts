import { describe, expect, it } from "vitest";
/**
 * Boundary-join compilation for compileMapLayerSpatialQuery.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery";
import {
  createGeometryLayerFixture,
  withAoiOverlay,
  withEmptyOverlay,
} from "./compileMapLayerSpatialQuery.fixtures";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ResolvedMapLayerMetadata } from "../../MapLayerSpatialQuery.types";

function _createBoundaryJoinLayer(
  fixture: ReturnType<typeof createGeometryLayerFixture>,
  matching: "exact" | "normalizedName",
) {
  const sourceKey = fixture.layer.source.queryColumns[1]!;
  const boundaryDatasetId = uuid<Dataset.Id>();
  const layer = {
    ...fixture.layer,
    geoBinding: {
      type: "joinToBoundaries" as const,
      dataKeyColumn: sourceKey.id,
      matching,
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
  return { layer, metadata };
}

describe("compileMapLayerSpatialQuery boundary join", () => {
  it.each([
    ["exact", false],
    ["normalizedName", true],
  ] as const)("compiles a %s boundary key join", (matching, isNormalized) => {
    const fixture = createGeometryLayerFixture();
    const { layer, metadata } = _createBoundaryJoinLayer(fixture, matching);

    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        layer,
        metadata,
        zoomBand: 3,
        simplificationReferenceLatitude: 0,
      }),
    );

    [
      "boundary_rows",
      "boundary_key_counts",
      "unambiguous_boundaries",
      "matched_rows",
      "area_values",
      "match_diagnostics",
    ].forEach((cte) => {
      expect(rawSql).toContain(`${cte} AS (`);
    });
    expect(rawSql).toContain('count(*) AS "__avandar_contributor_count"');
    expect(rawSql).toContain("unmatchedSourceKeyCount");
    expect(rawSql).toContain("duplicateBoundaryKeyCount");
    expect(rawSql.includes("nfc_normalize")).toBe(isNormalized);
    expect(rawSql).not.toContain("= NULL");
  });

  it("requires joined query-column denominators to agree per area", () => {
    const fixture = createGeometryLayerFixture();
    const { layer, metadata } = _createBoundaryJoinLayer(fixture, "exact");

    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        layer,
        metadata: {
          ...metadata,
          boundary: {
            ...metadata.boundary!,
            displayNameColumnName: undefined,
          },
          normalizationDenominator: {
            type: "queryColumn",
            columnName: "population",
          },
        },
        zoomBand: 0,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain('count(DISTINCT "population")');
    expect(rawSql).toContain('any_value("population")');
    expect(rawSql).toContain("'__avandar_denominator'");
  });

  it("puts the boundary key on each feature", () => {
    const fixture = createGeometryLayerFixture();
    const { layer, metadata } = _createBoundaryJoinLayer(fixture, "exact");
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        layer,
        metadata,
        zoomBand: 3,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain("'__avandar_boundary_key', boundary.boundary_key");
  });

  it("intersects only output boundary polygons with the aoi", () => {
    const fixture = createGeometryLayerFixture();
    const { layer, metadata } = _createBoundaryJoinLayer(fixture, "exact");
    const { rawSql } = compileMapLayerSpatialQuery(
      withAoiOverlay({
        layer,
        metadata,
        zoomBand: 3,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql.split("ST_Intersects").length - 1).toBe(1);
    expect(rawSql).toContain('ST_Intersects("__avandar_geometry"');
    const sourceRowsStart = rawSql.indexOf("source_rows AS (");
    const keyedSourceStart = rawSql.indexOf("keyed_source_rows AS (");
    expect(sourceRowsStart).toBeGreaterThanOrEqual(0);
    expect(keyedSourceStart).toBeGreaterThan(sourceRowsStart);
    expect(rawSql.slice(sourceRowsStart, keyedSourceStart)).not.toContain(
      "ST_Intersects",
    );
  });
});
