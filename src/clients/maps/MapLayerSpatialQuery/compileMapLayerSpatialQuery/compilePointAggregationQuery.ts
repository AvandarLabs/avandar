import { quoteSqlIdentifier } from "@avandar/utils/sql";
import {
  makeOutputAoiPredicateSql,
  makeSourceAoiPredicateSql,
} from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { makeGeometryExpressionFromValueExpression } from "../makeGeometryExpressionFromValueExpression/makeGeometryExpressionFromValueExpression";
import {
  MapLayerSpatialFeatureProperties,
  MapLayerSpatialQueryColumns,
} from "../MapLayerSpatialQuery.constants";
import { GEOMETRY_COLUMN } from "./compileMapLayerSpatialQuery.constants";
import {
  getAppliedAoiFromCompileOptions,
  makePointAggregateValueSql,
  makePointExpressionFromBinding,
  makeSimplifiedGeometrySql,
  makeSpatialQueryPlan,
  makeSuppressedAreaFeatureSql,
} from "./compileMapLayerSpatialQueryHelpers";
import type {
  MapLayerSpatialQueryPlan,
  ResolvedBoundarySource,
  ResolvedMapLayerMetadata,
} from "../MapLayerSpatialQuery.types";
import type {
  CompileOptions,
  CompileSourceOptions,
} from "./compileMapLayerSpatialQuery.types";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type PointAggregationBinding = Extract<
  MapLayer.GeoBinding,
  { type: "aggregatePointsToBoundaries" }
>;

type PointAggregationCteParts = {
  sourceSql: string;
  pointParser: string;
  boundaryKey: string;
  displayName: string;
  boundaryParser: string;
  geometry: string;
  boundaryDataset: string;
  denominatorSelect: string;
  disputedStatusSelect: string;
  aggregationSql: string;
  aoi: AvaMapConfig.AoiPolygon | undefined;
};

function _getPointAggregationBinding(options: Readonly<CompileOptions>): {
  binding: PointAggregationBinding;
  boundary: ResolvedBoundarySource;
} {
  const binding = options.layer.geoBinding;
  const boundary = options.metadata.boundary;
  if (binding?.type !== "aggregatePointsToBoundaries" || !boundary) {
    throw new Error("Resolved point aggregation metadata is required");
  }
  if (options.metadata.normalizationDenominator?.type === "queryColumn") {
    throw new Error("Point aggregation requires a boundary denominator");
  }
  return { binding, boundary };
}

function _buildPointAggregationDenominatorSql(
  metadata: ResolvedMapLayerMetadata,
): { selectSql: string; reportableSql: string } {
  const denominator = metadata.normalizationDenominator;
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.denominator,
  );
  return denominator?.type === "boundaryColumn" ?
      {
        selectSql: `, ${quoteSqlIdentifier(denominator.columnName)} AS ${alias}`,
        reportableSql: alias,
      }
    : { selectSql: "", reportableSql: "NULL" };
}

/** Selects the boundary's disputed-status column when the layer binds one. */
function _buildPointAggregationDisputedStatusSql(
  metadata: ResolvedMapLayerMetadata,
): { selectSql: string; reportableSql: string } {
  const reference = metadata.disputedStatusColumn;
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.disputedStatus,
  );
  return reference?.type === "boundaryColumn" ?
      {
        selectSql: `, ${quoteSqlIdentifier(reference.columnName)} AS ${alias}`,
        reportableSql: alias,
      }
    : { selectSql: "", reportableSql: "NULL" };
}

function _getMinimumContributorCount(layer: MapLayer.T): number {
  return layer.sensitivity.mode === "aggregateOnly" ?
      layer.sensitivity.minCellCount
    : 0;
}

function _buildParsedPointsCte(pointParser: string): string {
  return `parsed_points AS (
  SELECT row_number() OVER () AS point_id, source_rows.*,
    ${pointParser} AS point_geometry FROM source_rows
)`;
}

function _buildPointAggregationCtes(parts: PointAggregationCteParts): string {
  const sourceAoiWhere =
    parts.aoi ?
      ` AND ${makeSourceAoiPredicateSql("point_geometry", parts.aoi)}`
    : "";
  return `source_rows AS (${parts.sourceSql}),
${_buildParsedPointsCte(parts.pointParser)},
boundary_rows AS (
  SELECT row_number() OVER () AS boundary_feature_id,
    ${parts.boundaryKey} AS boundary_key, ${parts.displayName} AS boundary_name, ${parts.boundaryParser} AS ${parts.geometry}${parts.denominatorSelect}${parts.disputedStatusSelect}
  FROM ${parts.boundaryDataset}
),
point_boundary_candidates AS (
  SELECT point_id, boundary_feature_id FROM parsed_points, boundary_rows
  WHERE point_geometry IS NOT NULL AND ${parts.geometry} IS NOT NULL
    AND ST_Within(point_geometry, ${parts.geometry})${sourceAoiWhere}
),
point_match_counts AS (
  SELECT point_id, count(*) AS boundary_match_count
  FROM point_boundary_candidates GROUP BY point_id
),
assigned_points AS (
  SELECT parsed_points.*, candidate.boundary_feature_id
  FROM parsed_points JOIN point_match_counts USING (point_id)
  JOIN point_boundary_candidates candidate USING (point_id)
  WHERE boundary_match_count = 1
),
area_values AS (
  SELECT boundary_feature_id, count(*) AS contributor_count,
    ${parts.aggregationSql} AS aggregate_value
  FROM assigned_points GROUP BY boundary_feature_id
)`;
}

function _buildClassifiedAreasCte(minimumCount: number): string {
  return `classified_areas AS (
  SELECT boundary_rows.*, contributor_count,
    CASE WHEN contributor_count < ${minimumCount} THEN 'suppressed'
      WHEN contributor_count IS NULL THEN 'noData' ELSE 'value' END AS state,
    CASE WHEN contributor_count < ${minimumCount} THEN NULL
      WHEN contributor_count IS NULL THEN NULL ELSE aggregate_value END AS reportable_value
  FROM boundary_rows LEFT JOIN area_values USING (boundary_feature_id)
)`;
}

function _buildPointSpatialDiagnosticsCte(): string {
  return `spatial_diagnostics AS (
  SELECT count(*) FILTER (WHERE coalesce(boundary_match_count, 0) = 0) AS outside_boundary_count,
    count(*) FILTER (WHERE boundary_match_count > 1) AS overlap_count
  FROM parsed_points LEFT JOIN point_match_counts USING (point_id)
)`;
}

function _buildPointFeatureRowsCte(options: {
  geometry: string;
  reportableDenominator: string;
  disputedStatusSql: string;
  aoi: AvaMapConfig.AoiPolygon | undefined;
}): string {
  const outputAoiWhere =
    options.aoi ?
      `\n  WHERE ${makeOutputAoiPredicateSql(options.geometry, options.aoi)}`
    : "";
  return `feature_rows AS (
  SELECT ${makeSuppressedAreaFeatureSql({
    geometrySql: options.geometry,
    featureIdSql: "boundary_feature_id",
    nameSql: "boundary_name",
    keySql: "boundary_key",
    denominatorSql: options.reportableDenominator,
    contributorCountSql: "contributor_count",
    disputedStatusSql: options.disputedStatusSql,
  })} AS feature
  FROM classified_areas${outputAoiWhere}
)`;
}

function _buildPointDiagnosticSummaryCte(): string {
  return `diagnostic_summary AS (
  SELECT count(*) AS source_count, count(point_geometry) AS parsed_count,
    count(*) FILTER (WHERE point_geometry IS NULL) AS invalid_count,
    ['point'] AS observed_families, false AS has_mixed_families
  FROM parsed_points
)`;
}

function _buildPointAggregationSelect(): string {
  const featureAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnosticAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  return `SELECT json_object('type', 'FeatureCollection',
    'features', coalesce((SELECT json_group_array(feature) FROM feature_rows), json('[]')))
    AS ${featureAlias},
  json_object('sourceCount', source_count, 'parsedCount', parsed_count,
    'invalidCount', invalid_count, 'observedFamilies', to_json(observed_families),
    'hasMixedFamilies', has_mixed_families,
    'outsideBoundaryCount', outside_boundary_count, 'overlapCount', overlap_count,
    'suppressedCount', (SELECT count(*) FROM classified_areas WHERE state = 'suppressed'))
    AS ${diagnosticAlias}
FROM diagnostic_summary CROSS JOIN spatial_diagnostics`;
}

function _buildPointAggregationOutput(options: {
  geometry: string;
  minimumCount: number;
  reportableDenominator: string;
  disputedStatusSql: string;
  aoi: AvaMapConfig.AoiPolygon | undefined;
}): string {
  return `${_buildClassifiedAreasCte(options.minimumCount)},
${_buildPointSpatialDiagnosticsCte()},
${_buildPointFeatureRowsCte({
  geometry: options.geometry,
  reportableDenominator: options.reportableDenominator,
  disputedStatusSql: options.disputedStatusSql,
  aoi: options.aoi,
})},
${_buildPointDiagnosticSummaryCte()}
${_buildPointAggregationSelect()}`;
}

function _buildPointAggregationBoundaryParser(options: {
  boundary: ResolvedBoundarySource;
  compile: CompileOptions;
}): string {
  const { boundary, compile } = options;
  return makeSimplifiedGeometrySql({
    geometrySql: makeGeometryExpressionFromValueExpression({
      valueExpression: quoteSqlIdentifier(boundary.geometryColumnName),
      encoding: boundary.geometryEncoding,
    }),
    simplification: boundary.simplification,
    zoomBand: compile.zoomBand,
    simplificationReferenceLatitude: compile.simplificationReferenceLatitude,
  });
}

function _getPointDisplayNameSql(boundary: ResolvedBoundarySource): string {
  return boundary.displayNameColumnName ?
      quoteSqlIdentifier(boundary.displayNameColumnName)
    : quoteSqlIdentifier(boundary.keyColumnName);
}

/** Compiles privacy-safe point assignment and per-boundary aggregation. */
export function compilePointAggregationQuery(
  options: Readonly<CompileSourceOptions>,
): MapLayerSpatialQueryPlan {
  const { binding, boundary } = _getPointAggregationBinding(options);
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const denominator = _buildPointAggregationDenominatorSql(options.metadata);
  const disputedStatus = _buildPointAggregationDisputedStatusSql(
    options.metadata,
  );
  const aoi = getAppliedAoiFromCompileOptions(options);
  const rawSql = `WITH ${_buildPointAggregationCtes({
    sourceSql: options.sourceSql,
    pointParser: makePointExpressionFromBinding({
      points: binding.points,
      metadata: options.metadata,
    }),
    boundaryKey: quoteSqlIdentifier(boundary.keyColumnName),
    displayName: _getPointDisplayNameSql(boundary),
    boundaryParser: _buildPointAggregationBoundaryParser({
      boundary,
      compile: options,
    }),
    geometry,
    boundaryDataset: quoteSqlIdentifier(boundary.datasetId),
    denominatorSelect: denominator.selectSql,
    disputedStatusSelect: disputedStatus.selectSql,
    aggregationSql: makePointAggregateValueSql({
      aggregation: binding.aggregation,
      metadata: options.metadata,
    }),
    aoi,
  })},
${_buildPointAggregationOutput({
  geometry,
  minimumCount: _getMinimumContributorCount(options.layer),
  reportableDenominator: denominator.reportableSql,
  disputedStatusSql: disputedStatus.reportableSql,
  aoi,
})}`;
  return makeSpatialQueryPlan({
    compile: options,
    rawSql,
    family: "polygon",
    sourcePropertyColumnNames: [],
  });
}
