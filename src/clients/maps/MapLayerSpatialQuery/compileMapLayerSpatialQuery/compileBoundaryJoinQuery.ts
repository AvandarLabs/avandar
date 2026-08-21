import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { makeOutputAoiPredicateSql } from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { makeGeometryExpressionFromValueExpression } from "../makeGeometryExpressionFromValueExpression/makeGeometryExpressionFromValueExpression";
import { makeNormalizedBoundaryKeyFromValueExpression } from "../makeNormalizedBoundaryKeyFromValueExpression/makeNormalizedBoundaryKeyFromValueExpression";
import {
  MapLayerSpatialFeatureProperties,
  MapLayerSpatialQueryColumns,
} from "../MapLayerSpatialQuery.constants";
import {
  FAMILY_COLUMN,
  GEOMETRY_COLUMN,
} from "./compileMapLayerSpatialQuery.constants";
import {
  getAppliedAoiFromCompileOptions,
  makeFamilyExpressionFromGeometrySql,
  makeSimplifiedGeometrySql,
  makeSpatialQueryPlan,
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

type BoundaryJoinBinding = Extract<
  MapLayer.GeoBinding,
  { type: "joinToBoundaries" }
>;

type BoundaryJoinSqlParts = {
  sourceKey: string;
  matching: "exact" | "normalizedName";
  geometryParser: string;
  boundaryKey: string;
  displayName: string;
  geometryColumn: string;
  familyColumn: string;
  boundaryDataset: string;
  boundaryDenominator: string;
  aggregatedDenominator: string;
  disputedStatus: string;
  areaValue: string;
  contributorCount: string;
  valueAlias: string;
};

/** Builds an exact or normalized non-null boundary match key. */
function _buildMatchKey(options: {
  expression: string;
  matching: "exact" | "normalizedName";
}): string {
  return options.matching === "normalizedName" ?
      makeNormalizedBoundaryKeyFromValueExpression(options.expression)
    : options.expression;
}

/** Builds the selected area aggregation over matched source rows. */
function _buildAreaValueExpression(options: {
  binding: BoundaryJoinBinding;
  metadata: ResolvedMapLayerMetadata;
}): string {
  const { binding, metadata } = options;
  if (binding.aggregation.operation === "count") {
    return "count(*)";
  }
  const measure = metadata.aggregationMeasureColumnName;
  if (!measure) {
    throw new Error("The aggregation measure could not be resolved");
  }
  return `${binding.aggregation.operation}(${quoteSqlIdentifier(measure)})`;
}

/** Aggregates a query-column denominator only when its values agree. */
function _buildJoinedDenominatorExpression(
  metadata: ResolvedMapLayerMetadata,
): string | undefined {
  const denominator = metadata.normalizationDenominator;
  if (denominator?.type !== "queryColumn") {
    return undefined;
  }
  const column = quoteSqlIdentifier(denominator.columnName);
  return `CASE WHEN count(DISTINCT ${column}) FILTER (WHERE ${column} IS NOT NULL) = 1 THEN any_value(${column}) FILTER (WHERE ${column} IS NOT NULL) ELSE NULL END`;
}

function _getResolvedBoundaryJoin(options: Readonly<CompileOptions>): {
  binding: BoundaryJoinBinding;
  boundary: ResolvedBoundarySource;
  sourceKeyName: string;
} {
  const binding = options.layer.geoBinding;
  const boundary = options.metadata.boundary;
  if (binding?.type !== "joinToBoundaries" || !boundary) {
    throw new Error("Resolved boundary join metadata is required");
  }
  const sourceKeyName = options.metadata.sourceColumnNames.get(
    binding.dataKeyColumn,
  );
  if (!sourceKeyName) {
    throw new Error("The source boundary key could not be resolved");
  }
  return { binding, boundary, sourceKeyName };
}

function _buildBoundaryDenominatorSql(
  metadata: ResolvedMapLayerMetadata,
): string {
  const denominator = metadata.normalizationDenominator;
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.denominator,
  );
  return denominator?.type === "boundaryColumn" ?
      `, ${quoteSqlIdentifier(denominator.columnName)} AS ${alias}`
    : "";
}

function _buildAggregatedDenominatorSql(
  metadata: ResolvedMapLayerMetadata,
): string {
  const joinedDenominator = _buildJoinedDenominatorExpression(metadata);
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.denominator,
  );
  return joinedDenominator ? `, ${joinedDenominator} AS ${alias}` : "";
}

/** Selects the boundary's disputed-status column when the layer binds one. */
function _buildBoundaryDisputedStatusSql(
  metadata: ResolvedMapLayerMetadata,
): string {
  const reference = metadata.disputedStatusColumn;
  if (reference?.type !== "boundaryColumn") {
    return "";
  }
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.disputedStatus,
  );
  return `, ${quoteSqlIdentifier(reference.columnName)} AS ${alias}`;
}

function _getBoundaryJoinSqlParts(
  options: Readonly<CompileOptions>,
): BoundaryJoinSqlParts {
  const { binding, boundary, sourceKeyName } =
    _getResolvedBoundaryJoin(options);
  const boundaryKey = quoteSqlIdentifier(boundary.keyColumnName);
  const properties = MapLayerSpatialFeatureProperties;
  return {
    sourceKey: quoteSqlIdentifier(sourceKeyName),
    matching: binding.matching,
    geometryParser: makeSimplifiedGeometrySql({
      geometrySql: makeGeometryExpressionFromValueExpression({
        valueExpression: quoteSqlIdentifier(boundary.geometryColumnName),
        encoding: boundary.geometryEncoding,
      }),
      simplification: boundary.simplification,
      zoomBand: options.zoomBand,
      simplificationReferenceLatitude: options.simplificationReferenceLatitude,
    }),
    boundaryKey,
    displayName:
      boundary.displayNameColumnName ?
        quoteSqlIdentifier(boundary.displayNameColumnName)
      : boundaryKey,
    geometryColumn: quoteSqlIdentifier(GEOMETRY_COLUMN),
    familyColumn: quoteSqlIdentifier(FAMILY_COLUMN),
    boundaryDataset: quoteSqlIdentifier(boundary.datasetId),
    boundaryDenominator: _buildBoundaryDenominatorSql(options.metadata),
    aggregatedDenominator: _buildAggregatedDenominatorSql(options.metadata),
    disputedStatus: _buildBoundaryDisputedStatusSql(options.metadata),
    areaValue: _buildAreaValueExpression({
      binding,
      metadata: options.metadata,
    }),
    contributorCount: quoteSqlIdentifier(properties.contributorCount),
    valueAlias: quoteSqlIdentifier(properties.value),
  };
}

/** Builds matched-row and per-boundary aggregation CTEs. */
function _buildMatchedAreaCtes(parts: BoundaryJoinSqlParts): string {
  return `matched_rows AS (
  SELECT keyed_source_rows.*, unambiguous_boundaries.boundary_feature_id
  FROM keyed_source_rows JOIN unambiguous_boundaries USING (match_key)
),
area_values AS (
  SELECT boundary_feature_id,
    count(*) AS ${parts.contributorCount},
    ${parts.areaValue} AS ${parts.valueAlias}${parts.aggregatedDenominator}
  FROM matched_rows GROUP BY boundary_feature_id
)`;
}

/** Builds boundary parsing, duplicate detection, matching, and aggregation. */
function _buildBoundaryJoinCtes(options: {
  parts: BoundaryJoinSqlParts;
  sourceSql: string;
}): string {
  const { parts, sourceSql } = options;
  const sourceMatch = _buildMatchKey({
    expression: parts.sourceKey,
    matching: parts.matching,
  });
  const boundaryMatch = _buildMatchKey({
    expression: "boundary_key",
    matching: parts.matching,
  });
  const familyExpression = makeFamilyExpressionFromGeometrySql(
    parts.geometryColumn,
  );
  return `source_rows AS (${sourceSql}),
keyed_source_rows AS (
  SELECT source_rows.*, ${parts.sourceKey} AS source_key,
    ${sourceMatch} AS match_key
  FROM source_rows WHERE ${parts.sourceKey} IS NOT NULL
),
boundary_rows AS (
  SELECT row_number() OVER () AS boundary_feature_id,
    ${parts.boundaryKey} AS boundary_key, ${parts.displayName} AS boundary_name,
    ${parts.geometryParser} AS ${parts.geometryColumn}${parts.boundaryDenominator}${parts.disputedStatus}
  FROM ${parts.boundaryDataset}
),
typed_boundaries AS (
  SELECT boundary_rows.*,
    ${boundaryMatch} AS match_key,
    ${familyExpression} AS ${parts.familyColumn}
  FROM boundary_rows
),
boundary_key_counts AS (
  SELECT match_key, count(*) AS boundary_key_count
  FROM typed_boundaries WHERE match_key IS NOT NULL
  GROUP BY match_key
),
unambiguous_boundaries AS (
  SELECT typed_boundaries.* FROM typed_boundaries
  JOIN boundary_key_counts USING (match_key)
  WHERE boundary_key_count = 1 AND ${parts.familyColumn} = 'polygon'
),
${_buildMatchedAreaCtes(parts)}`;
}

/** Builds capped match diagnostics without inflating the result envelope. */
function _buildMatchDiagnostics(isAggregateOnly: boolean): string {
  const unmatchedSamples =
    isAggregateOnly ? "[]" : (
      "coalesce(list_slice(list(source_key) FILTER (WHERE boundary_feature_id IS NULL), 1, 20), [])"
    );
  return `match_diagnostics AS (
  SELECT
    (SELECT count(*) FROM matched_rows) AS matched_source_key_count,
    (SELECT count(*) FROM keyed_source_rows source
      LEFT JOIN unambiguous_boundaries boundary USING (match_key)
      WHERE boundary.boundary_feature_id IS NULL) AS unmatched_source_key_count,
    (SELECT count(*) FROM unambiguous_boundaries boundary
      LEFT JOIN area_values USING (boundary_feature_id)
      WHERE area_values.boundary_feature_id IS NULL) AS unmatched_boundary_count,
    (SELECT count(*) FROM boundary_key_counts WHERE boundary_key_count > 1) AS duplicate_boundary_key_count,
    (SELECT count(*) FROM keyed_source_rows source
      JOIN boundary_key_counts USING (match_key)
      WHERE boundary_key_count > 1) AS ambiguous_source_key_count,
    (SELECT ${unmatchedSamples} FROM keyed_source_rows source
      LEFT JOIN unambiguous_boundaries boundary USING (match_key)) AS unmatched_source_key_samples
)`;
}

function _buildBoundaryFeatureRowsCte(options: {
  geometry: string;
  denominator: string;
  disputedStatus: string;
  aoi: AvaMapConfig.AoiPolygon | undefined;
}): string {
  const properties = MapLayerSpatialFeatureProperties;
  const outputAoiWhere =
    options.aoi ?
      `\n  WHERE ${makeOutputAoiPredicateSql(options.geometry, options.aoi)}`
    : "";
  return `feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${options.geometry})),
    'properties', json_object(
      '${properties.featureId}', boundary.boundary_feature_id,
      '${properties.boundaryKey}', boundary.boundary_key,
      '${properties.boundaryName}', boundary.boundary_name,
      '${properties.state}', CASE WHEN area_values.boundary_feature_id IS NULL THEN 'noData' ELSE 'value' END,
      '${properties.value}', ${quoteSqlIdentifier(properties.value)},
      '${properties.denominator}', ${options.denominator},
      '${properties.contributorCount}', ${quoteSqlIdentifier(properties.contributorCount)},
      '${properties.disputedStatus}', ${options.disputedStatus}
    )) AS feature
  FROM unambiguous_boundaries boundary
  LEFT JOIN area_values USING (boundary_feature_id)${outputAoiWhere}
)`;
}

function _buildBoundaryDiagnosticSummaryCte(geometry: string): string {
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  return `diagnostic_summary AS (
  SELECT (SELECT count(*) FROM boundary_rows) AS source_count,
    (SELECT count(${geometry}) FROM boundary_rows) AS parsed_count,
    (SELECT count(*) FROM boundary_rows WHERE ${geometry} IS NULL) AS invalid_count,
    (SELECT list_distinct(list(${family}) FILTER
      (WHERE ${family} IS NOT NULL)) FROM typed_boundaries) AS observed_families,
    (SELECT count(DISTINCT ${family}) FILTER
      (WHERE ${family} IS NOT NULL) > 1 FROM typed_boundaries) AS has_mixed_families
)`;
}

function _getJoinDenominatorSql(
  denominatorType: "queryColumn" | "boundaryColumn" | undefined,
): string {
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.denominator,
  );
  return (
    denominatorType === "queryColumn" ? `area_values.${alias}`
    : denominatorType === "boundaryColumn" ? `boundary.${alias}`
    : "NULL"
  );
}

/** Reads the boundary's disputed-status column when the layer binds one. */
function _getJoinDisputedStatusSql(
  disputedStatusType: "queryColumn" | "boundaryColumn" | undefined,
): string {
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.disputedStatus,
  );
  return disputedStatusType === "boundaryColumn" ? `boundary.${alias}` : "NULL";
}

/** Builds GeoJSON features and the stable join diagnostic envelope. */
function _buildBoundaryJoinOutput(options: {
  isAggregateOnly: boolean;
  denominatorType: "queryColumn" | "boundaryColumn" | undefined;
  disputedStatusType: "queryColumn" | "boundaryColumn" | undefined;
  aoi: AvaMapConfig.AoiPolygon | undefined;
}): string {
  const { isAggregateOnly, denominatorType, disputedStatusType, aoi } = options;
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const featureAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnosticAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  const samples =
    isAggregateOnly ? "json('[]')" : "to_json(unmatched_source_key_samples)";
  return `${_buildMatchDiagnostics(isAggregateOnly)},
${_buildBoundaryFeatureRowsCte({
  geometry,
  denominator: _getJoinDenominatorSql(denominatorType),
  disputedStatus: _getJoinDisputedStatusSql(disputedStatusType),
  aoi,
})},
${_buildBoundaryDiagnosticSummaryCte(geometry)}
SELECT json_object('type', 'FeatureCollection',
    'features', coalesce((SELECT json_group_array(feature) FROM feature_rows), json('[]'))) AS ${featureAlias},
  json_object('sourceCount', source_count, 'parsedCount', parsed_count,
    'invalidCount', invalid_count, 'observedFamilies', coalesce(to_json(observed_families), json('[]')),
    'hasMixedFamilies', has_mixed_families,
    'matchedSourceKeyCount', matched_source_key_count,
    'unmatchedSourceKeyCount', unmatched_source_key_count,
    'unmatchedBoundaryCount', unmatched_boundary_count,
    'duplicateBoundaryKeyCount', duplicate_boundary_key_count,
    'ambiguousSourceKeyCount', ambiguous_source_key_count,
    'unmatchedSourceKeySamples', ${samples}) AS ${diagnosticAlias}
FROM diagnostic_summary CROSS JOIN match_diagnostics`;
}

/** Compiles a workspace boundary-key join. */
export function compileBoundaryJoinQuery(
  options: Readonly<CompileSourceOptions>,
): MapLayerSpatialQueryPlan {
  const isAggregateOnly = options.layer.sensitivity.mode === "aggregateOnly";
  const rawSql = `WITH ${_buildBoundaryJoinCtes({
    parts: _getBoundaryJoinSqlParts(options),
    sourceSql: options.sourceSql,
  })},
${_buildBoundaryJoinOutput({
  isAggregateOnly,
  denominatorType: options.metadata.normalizationDenominator?.type,
  disputedStatusType: options.metadata.disputedStatusColumn?.type,
  aoi: getAppliedAoiFromCompileOptions(options),
})}`;
  return makeSpatialQueryPlan({
    compile: options,
    rawSql,
    family: "polygon",
    sourcePropertyColumnNames: [],
  });
}
