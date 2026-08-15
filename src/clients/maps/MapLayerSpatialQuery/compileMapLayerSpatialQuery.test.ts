import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { compileMapLayerSpatialQuery } from "./compileMapLayerSpatialQuery";
import { MapLayerSpatialQueryColumns } from "./MapLayerSpatialQuery.constants";
import type { ResolvedMapLayerMetadata } from "./MapLayerSpatialQuery.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

function _createDataset(): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Shapes",
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

function _createColumn(dataset: Dataset.T, name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  });
}

function _createFixture() {
  const dataset = _createDataset();
  const geometry = QueryColumn.makeFromDatasetColumn(
    _createColumn(dataset, 'shape"; DROP TABLE maps; --'),
  );
  const label = QueryColumn.makeFromDatasetColumn(
    _createColumn(dataset, "label"),
  );
  const emptyLayer = MapLayer.makeEmpty("Geometry");
  const layer: MapLayer.T = {
    ...emptyLayer,
    source: {
      ...emptyLayer.source,
      dataSource: dataset,
      queryColumns: [geometry, label],
    },
    popup: { columnIds: [label.id], action: undefined },
    geoBinding: {
      type: "geometryColumn",
      column: geometry.id,
      encoding: "wkt",
      family: "polygon",
      simplification: { tolerancePixels: 0.75 },
    },
    symbology: {
      type: "fill",
      color: { type: "single", color: "#228be6" },
      opacity: 0.65,
      stroke: { color: "#1864ab", width: 1 },
    },
  };
  const metadata: ResolvedMapLayerMetadata = {
    type: "resolved",
    sourceColumnNames: new Map([
      [geometry.id, 'shape"; DROP TABLE maps; --'],
      [label.id, "label"],
    ]),
    boundary: undefined,
    aggregationMeasureColumnName: undefined,
    normalizationDenominator: undefined,
  };
  return { layer, metadata };
}

describe("compileMapLayerSpatialQuery", () => {
  it("wraps source SQL and emits the stable one-row envelope", () => {
    const fixture = _createFixture();
    const plan = compileMapLayerSpatialQuery({
      ...fixture,
      zoomBand: 7,
      simplificationReferenceLatitude: 38.9,
    });

    expect(plan.rawSql).toContain("source_rows AS (");
    expect(plan.rawSql).toContain("parsed_rows AS (");
    expect(plan.rawSql).toContain("typed_rows AS (");
    expect(plan.rawSql).toContain("diagnostic_summary AS (");
    expect(plan.rawSql).toContain("feature_rows AS (");
    expect(plan.rawSql).toContain("ST_SimplifyPreserveTopology");
    expect(plan.rawSql).toContain(
      'replace(CAST(ST_GeometryType("__avandar_geometry") AS VARCHAR)',
    );
    expect(plan.rawSql).toContain("'EPSG:3857'");
    expect(plan.rawSql).toContain("always_xy := true");
    expect(plan.rawSql).toContain(
      `AS "${MapLayerSpatialQueryColumns.featureCollection}"`,
    );
    expect(plan.rawSql).toContain(
      `AS "${MapLayerSpatialQueryColumns.diagnostics}"`,
    );
    expect(plan.family).toBe("polygon");
    expect(plan.sourcePropertyColumnNames).toEqual(["label"]);
  });

  it("quotes a hostile geometry identifier everywhere it is referenced", () => {
    const fixture = _createFixture();
    const { rawSql } = compileMapLayerSpatialQuery({
      ...fixture,
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
    });
    const hostileName = 'shape"; DROP TABLE maps; --';
    const quotedName = '"shape""; DROP TABLE maps; --"';

    expect(rawSql).toContain(quotedName);
    expect(rawSql.replaceAll(quotedName, "")).not.toContain(hostileName);
  });

  it("emits a direct query-column denominator as a reserved property", () => {
    const fixture = _createFixture();
    const denominator = fixture.layer.source.queryColumns[1]!;
    const { rawSql } = compileMapLayerSpatialQuery({
      ...fixture,
      metadata: {
        ...fixture.metadata,
        normalizationDenominator: {
          type: "queryColumn",
          columnName: "label",
        },
      },
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
    });

    expect(denominator.id).toBeDefined();
    expect(rawSql).toContain("'__avandar_denominator', \"label\"");
  });

  it.each(["point", "line", "polygon"] as const)(
    "compiles the configured %s family",
    (family) => {
      const fixture = _createFixture();
      const binding = fixture.layer.geoBinding;
      if (binding?.type !== "geometryColumn") {
        throw new Error("Expected a geometry-column fixture");
      }
      const layer = {
        ...fixture.layer,
        geoBinding: { ...binding, family },
      } as MapLayer.T;

      expect(
        compileMapLayerSpatialQuery({
          layer,
          metadata: fixture.metadata,
          zoomBand: 2,
          simplificationReferenceLatitude: 0,
        }).family,
      ).toBe(family);
    },
  );

  it("does not simplify point geometry", () => {
    const fixture = _createFixture();
    const binding = fixture.layer.geoBinding;
    if (binding?.type !== "geometryColumn") {
      throw new Error("Expected a geometry-column fixture");
    }
    const layer = {
      ...fixture.layer,
      geoBinding: {
        ...binding,
        family: "point" as const,
        simplification: undefined,
      },
    } as MapLayer.T;

    const { rawSql } = compileMapLayerSpatialQuery({
      layer,
      metadata: fixture.metadata,
      zoomBand: 4,
      simplificationReferenceLatitude: 0,
    });

    expect(rawSql).not.toContain("ST_SimplifyPreserveTopology");
  });

  it.each([
    ["exact", false],
    ["normalizedName", true],
  ] as const)("compiles a %s boundary key join", (matching, isNormalized) => {
    const fixture = _createFixture();
    const binding = fixture.layer.geoBinding;
    if (binding?.type !== "geometryColumn") {
      throw new Error("Expected a geometry-column fixture");
    }
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

    const { rawSql } = compileMapLayerSpatialQuery({
      layer,
      metadata,
      zoomBand: 3,
      simplificationReferenceLatitude: 0,
    });

    for (const cte of [
      "boundary_rows",
      "boundary_key_counts",
      "unambiguous_boundaries",
      "matched_rows",
      "area_values",
      "match_diagnostics",
    ]) {
      expect(rawSql).toContain(`${cte} AS (`);
    }
    expect(rawSql).toContain('count(*) AS "__avandar_contributor_count"');
    expect(rawSql).toContain("unmatchedSourceKeyCount");
    expect(rawSql).toContain("duplicateBoundaryKeyCount");
    expect(rawSql.includes("nfc_normalize")).toBe(isNormalized);
    expect(rawSql).not.toContain("= NULL");
  });

  it("requires joined query-column denominators to agree per area", () => {
    const fixture = _createFixture();
    const sourceKey = fixture.layer.source.queryColumns[1]!;
    const boundaryDatasetId = uuid<Dataset.Id>();
    const layer = {
      ...fixture.layer,
      geoBinding: {
        type: "joinToBoundaries" as const,
        dataKeyColumn: sourceKey.id,
        matching: "exact" as const,
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
      normalizationDenominator: {
        type: "queryColumn",
        columnName: "population",
      },
    };

    const { rawSql } = compileMapLayerSpatialQuery({
      layer,
      metadata,
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
    });

    expect(rawSql).toContain('count(DISTINCT "population")');
    expect(rawSql).toContain('any_value("population")');
    expect(rawSql).toContain("'__avandar_denominator'");
  });

  it("compiles point-in-polygon assignment with query-level suppression", () => {
    const fixture = _createFixture();
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
