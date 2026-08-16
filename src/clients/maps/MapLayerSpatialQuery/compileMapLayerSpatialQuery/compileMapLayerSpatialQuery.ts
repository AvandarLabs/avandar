import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import {
  PolarEpsg,
  UtmEpsgBase,
} from "@/views/GisApp/layers/getUtmEpsgFromLongitudeLatitude/getUtmEpsgFromLongitudeLatitude";
import { buildGeometryExpression } from "../buildGeometryExpression/buildGeometryExpression";
import { buildGridCellExpressions } from "../buildGridCellExpressions/buildGridCellExpressions";
import { buildNormalizedBoundaryKey } from "../buildNormalizedBoundaryKey/buildNormalizedBoundaryKey";
import { getSimplificationTolerance } from "../getSimplificationTolerance/getSimplificationTolerance";
import {
  MapLayerSpatialFeatureProperties,
  MapLayerSpatialQueryColumns,
} from "../MapLayerSpatialQuery.constants";
import type {
  MapLayerSpatialQueryPlan,
  ResolvedMapLayerMetadata,
} from "../MapLayerSpatialQuery.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type CompileOptions = {
  layer: MapLayer.T;
  metadata: ResolvedMapLayerMetadata;
  zoomBand: number;
  simplificationReferenceLatitude: number;
};

const GEOMETRY_COLUMN = "__avandar_geometry";
const FAMILY_COLUMN = "__avandar_geometry_family";

/**
 * Screen-space tolerance used to simplify grid-cell outlines.
 *
 * Cell size is fixed in meters, so a bin binding persists no simplification of
 * its own; only the drawn outline follows the zoom band.
 */
const GRID_CELL_SIMPLIFICATION: MapLayer.GeometrySimplification = {
  tolerancePixels: 0.75,
};

/** Applies topology-preserving Web Mercator simplification when configured. */
function _buildSimplifiedGeometry(
  geometry: string,
  simplification: MapLayer.GeometrySimplification | undefined,
  options: Pick<CompileOptions, "zoomBand" | "simplificationReferenceLatitude">,
): string {
  if (!simplification || simplification.tolerancePixels <= 0) {
    return geometry;
  }
  const tolerance = getSimplificationTolerance(
    options.zoomBand,
    options.simplificationReferenceLatitude,
    simplification.tolerancePixels,
  );
  const projected = `ST_Transform(${geometry}, 'EPSG:4326', 'EPSG:3857', always_xy := true)`;
  return `ST_Transform(ST_SimplifyPreserveTopology(${projected}, ${tolerance}), 'EPSG:3857', 'EPSG:4326', always_xy := true)`;
}

/** Maps DuckDB single and multi geometry types to renderable families. */
function _buildFamilyExpression(geometry: string): string {
  const normalizedType = `upper(replace(CAST(ST_GeometryType(${geometry}) AS VARCHAR), 'ST_', ''))`;
  return (
    `CASE WHEN ${normalizedType} IN ('POINT', 'MULTIPOINT') THEN 'point' ` +
    `WHEN ${normalizedType} IN ('LINESTRING', 'MULTILINESTRING') THEN 'line' ` +
    `WHEN ${normalizedType} IN ('POLYGON', 'MULTIPOLYGON') THEN 'polygon' ` +
    `ELSE NULL END`
  );
}

/** Builds the selected popup properties for a direct geometry layer. */
function _getPropertyColumnNames(
  layer: MapLayer.T,
  metadata: ResolvedMapLayerMetadata,
): readonly string[] {
  const geometryColumnId =
    layer.geoBinding?.type === "geometryColumn" ?
      layer.geoBinding.column
    : undefined;
  const selectedIds =
    layer.popup.columnIds === "all" ?
      layer.source.queryColumns.map(({ id }) => {
        return id;
      })
    : layer.popup.columnIds;
  return selectedIds
    .filter((columnId) => {
      return columnId !== geometryColumnId;
    })
    .map((columnId) => {
      return metadata.sourceColumnNames.get(columnId);
    })
    .filter((name): name is string => {
      return name !== undefined;
    });
}

/** Builds a DuckDB JSON object expression for selected source properties. */
function _buildPropertiesExpression(
  columnNames: readonly string[],
  denominatorColumnName?: string,
): string {
  if (columnNames.length === 0 && !denominatorColumnName) {
    return "json_object()";
  }
  const entries = columnNames.flatMap((columnName) => {
    return [quoteSqlLiteral(columnName), quoteSqlIdentifier(columnName)];
  });
  if (denominatorColumnName) {
    entries.push(
      quoteSqlLiteral(MapLayerSpatialFeatureProperties.denominator),
      quoteSqlIdentifier(denominatorColumnName),
    );
  }
  return `json_object(${entries.join(", ")})`;
}

/** Builds diagnostic counts and observed-family metadata. */
function _buildDiagnosticSummary(): string {
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  return `diagnostic_summary AS (
  SELECT count(*) AS source_count,
    count(${geometry}) AS parsed_count,
    count(*) FILTER (WHERE ${geometry} IS NULL) AS invalid_count,
    list_distinct(list(${family}) FILTER (WHERE ${family} IS NOT NULL)) AS observed_families,
    count(DISTINCT ${family}) FILTER (WHERE ${family} IS NOT NULL) > 1 AS has_mixed_families
  FROM typed_rows
)`;
}

/** Builds the final stable two-column JSON envelope. */
function _buildFinalSelect(): string {
  const featureAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnosticsAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  return `SELECT json_object(
    'type', 'FeatureCollection',
    'features', coalesce((SELECT json_group_array(feature) FROM feature_rows), json('[]'))
  ) AS ${featureAlias},
  json_object(
    'sourceCount', source_count,
    'parsedCount', parsed_count,
    'invalidCount', invalid_count,
    'observedFamilies', coalesce(to_json(observed_families), json('[]')),
    'hasMixedFamilies', has_mixed_families
  ) AS ${diagnosticsAlias}
FROM diagnostic_summary`;
}

/** Builds an exact or normalized non-null boundary match key. */
function _buildMatchKey(
  expression: string,
  matching: "exact" | "normalizedName",
): string {
  return matching === "normalizedName" ?
      buildNormalizedBoundaryKey(expression)
    : expression;
}

/** Builds the selected area aggregation over matched source rows. */
function _buildAreaValueExpression(
  binding: Extract<MapLayer.GeoBinding, { type: "joinToBoundaries" }>,
  metadata: ResolvedMapLayerMetadata,
): string {
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

/** Builds boundary parsing, duplicate detection, matching, and aggregation. */
function _buildBoundaryJoinCtes(
  options: Readonly<CompileOptions>,
  sourceSql: string,
): string {
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
  const sourceKey = quoteSqlIdentifier(sourceKeyName);
  const boundaryKey = quoteSqlIdentifier(boundary.keyColumnName);
  const geometrySource = quoteSqlIdentifier(boundary.geometryColumnName);
  const geometryParser = _buildSimplifiedGeometry(
    buildGeometryExpression(geometrySource, boundary.geometryEncoding),
    boundary.simplification,
    options,
  );
  const displayName =
    boundary.displayNameColumnName ?
      quoteSqlIdentifier(boundary.displayNameColumnName)
    : boundaryKey;
  const boundaryDenominator =
    options.metadata.normalizationDenominator?.type === "boundaryColumn" ?
      `, ${quoteSqlIdentifier(options.metadata.normalizationDenominator.columnName)} AS ${quoteSqlIdentifier(MapLayerSpatialFeatureProperties.denominator)}`
    : "";
  const joinedDenominator = _buildJoinedDenominatorExpression(options.metadata);
  const aggregatedDenominator =
    joinedDenominator ?
      `, ${joinedDenominator} AS ${quoteSqlIdentifier(MapLayerSpatialFeatureProperties.denominator)}`
    : "";
  return `source_rows AS (${sourceSql}),
keyed_source_rows AS (
  SELECT source_rows.*, ${sourceKey} AS source_key,
    ${_buildMatchKey(sourceKey, binding.matching)} AS match_key
  FROM source_rows WHERE ${sourceKey} IS NOT NULL
),
boundary_rows AS (
  SELECT row_number() OVER () AS boundary_feature_id,
    ${boundaryKey} AS boundary_key, ${displayName} AS boundary_name,
    ${geometryParser} AS ${quoteSqlIdentifier(GEOMETRY_COLUMN)}${boundaryDenominator}
  FROM ${quoteSqlIdentifier(boundary.datasetId)}
),
typed_boundaries AS (
  SELECT boundary_rows.*,
    ${_buildMatchKey("boundary_key", binding.matching)} AS match_key,
    ${_buildFamilyExpression(quoteSqlIdentifier(GEOMETRY_COLUMN))} AS ${quoteSqlIdentifier(FAMILY_COLUMN)}
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
  WHERE boundary_key_count = 1 AND ${quoteSqlIdentifier(FAMILY_COLUMN)} = 'polygon'
),
matched_rows AS (
  SELECT keyed_source_rows.*, unambiguous_boundaries.boundary_feature_id
  FROM keyed_source_rows JOIN unambiguous_boundaries USING (match_key)
),
area_values AS (
  SELECT boundary_feature_id,
    count(*) AS ${quoteSqlIdentifier(MapLayerSpatialFeatureProperties.contributorCount)},
    ${_buildAreaValueExpression(binding, options.metadata)} AS ${quoteSqlIdentifier(MapLayerSpatialFeatureProperties.value)}${aggregatedDenominator}
  FROM matched_rows GROUP BY boundary_feature_id
)`;
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

/** Builds GeoJSON features and the stable join diagnostic envelope. */
function _buildBoundaryJoinOutput(
  isAggregateOnly: boolean,
  denominatorType: "queryColumn" | "boundaryColumn" | undefined,
): string {
  const properties = MapLayerSpatialFeatureProperties;
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const featureAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnosticAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  const samples =
    isAggregateOnly ? "json('[]')" : "to_json(unmatched_source_key_samples)";
  const denominator =
    denominatorType === "queryColumn" ?
      `area_values.${quoteSqlIdentifier(properties.denominator)}`
    : denominatorType === "boundaryColumn" ?
      `boundary.${quoteSqlIdentifier(properties.denominator)}`
    : "NULL";
  return `${_buildMatchDiagnostics(isAggregateOnly)},
feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${geometry})),
    'properties', json_object(
      '${properties.featureId}', boundary.boundary_feature_id,
      '${properties.boundaryName}', boundary.boundary_name,
      '${properties.state}', CASE WHEN area_values.boundary_feature_id IS NULL THEN 'noData' ELSE 'value' END,
      '${properties.value}', ${quoteSqlIdentifier(properties.value)},
      '${properties.denominator}', ${denominator},
      '${properties.contributorCount}', ${quoteSqlIdentifier(properties.contributorCount)}
    )) AS feature
  FROM unambiguous_boundaries boundary
  LEFT JOIN area_values USING (boundary_feature_id)
),
diagnostic_summary AS (
  SELECT (SELECT count(*) FROM boundary_rows) AS source_count,
    (SELECT count(${geometry}) FROM boundary_rows) AS parsed_count,
    (SELECT count(*) FROM boundary_rows WHERE ${geometry} IS NULL) AS invalid_count,
    (SELECT list_distinct(list(${quoteSqlIdentifier(FAMILY_COLUMN)}) FILTER
      (WHERE ${quoteSqlIdentifier(FAMILY_COLUMN)} IS NOT NULL)) FROM typed_boundaries) AS observed_families,
    (SELECT count(DISTINCT ${quoteSqlIdentifier(FAMILY_COLUMN)}) FILTER
      (WHERE ${quoteSqlIdentifier(FAMILY_COLUMN)} IS NOT NULL) > 1 FROM typed_boundaries) AS has_mixed_families
)
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
function _compileBoundaryJoin(
  options: Readonly<CompileOptions>,
  sourceSql: string,
): MapLayerSpatialQueryPlan {
  const rawSql =
    `WITH ${_buildBoundaryJoinCtes(options, sourceSql)},\n` +
    _buildBoundaryJoinOutput(
      options.layer.sensitivity.mode === "aggregateOnly",
      options.metadata.normalizationDenominator?.type,
    );
  return {
    rawSql,
    family: "polygon",
    sourcePropertyColumnNames: [],
    zoomBand: options.zoomBand,
    simplificationReferenceLatitude: options.simplificationReferenceLatitude,
  };
}

/** Compiles a direct geometry-column layer. */
function _compileGeometryColumn(
  options: Readonly<CompileOptions>,
  sourceSql: string,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    throw new Error("A geometry-column binding is required");
  }
  const geometryColumnName = options.metadata.sourceColumnNames.get(
    binding.column,
  );
  if (!geometryColumnName) {
    throw new Error("The geometry column could not be resolved");
  }
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  const properties = _getPropertyColumnNames(options.layer, options.metadata);
  const parser = _buildSimplifiedGeometry(
    buildGeometryExpression(
      quoteSqlIdentifier(geometryColumnName),
      binding.encoding,
    ),
    binding.family === "point" ? undefined : binding.simplification,
    options,
  );
  const rawSql = `WITH source_rows AS (${sourceSql}),
parsed_rows AS (
  SELECT source_rows.*, ${parser} AS ${geometry} FROM source_rows
),
typed_rows AS (
  SELECT parsed_rows.*, ${_buildFamilyExpression(geometry)} AS ${family} FROM parsed_rows
),
${_buildDiagnosticSummary()},
feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${geometry})),
    'properties', ${_buildPropertiesExpression(
      properties,
      options.metadata.normalizationDenominator?.type === "queryColumn" ?
        options.metadata.normalizationDenominator.columnName
      : undefined,
    )}) AS feature
  FROM typed_rows
  WHERE ${family} = ${quoteSqlLiteral(binding.family)}
    AND (SELECT has_mixed_families FROM diagnostic_summary) = false
)
${_buildFinalSelect()}`;
  return {
    rawSql,
    family: binding.family,
    sourcePropertyColumnNames: properties,
    zoomBand: options.zoomBand,
    simplificationReferenceLatitude: options.simplificationReferenceLatitude,
  };
}

/** Builds point geometry from coordinate or encoded-geometry input. */
function _buildPointExpression(
  points: MapLayer.PointBinding,
  metadata: ResolvedMapLayerMetadata,
): string {
  if (points.type === "geometryColumn") {
    const name = metadata.sourceColumnNames.get(points.column);
    if (!name) {
      throw new Error("The point geometry column could not be resolved");
    }
    return buildGeometryExpression(quoteSqlIdentifier(name), points.encoding);
  }
  const latitude =
    points.latitude ?
      metadata.sourceColumnNames.get(points.latitude)
    : undefined;
  const longitude =
    points.longitude ?
      metadata.sourceColumnNames.get(points.longitude)
    : undefined;
  if (!latitude || !longitude) {
    throw new Error("Both point coordinate columns are required");
  }
  return `TRY(ST_Point(${quoteSqlIdentifier(longitude)}, ${quoteSqlIdentifier(latitude)}))`;
}

/** Builds the selected point aggregation metric. */
function _buildPointAggregateValue(
  aggregation: MapLayer.AreaAggregation,
  metadata: ResolvedMapLayerMetadata,
): string {
  if (aggregation.operation === "count") {
    return "count(*)";
  }
  const measure = metadata.aggregationMeasureColumnName;
  if (!measure) {
    throw new Error("The point aggregation measure is unresolved");
  }
  return `${aggregation.operation}(${quoteSqlIdentifier(measure)})`;
}

/** Compiles privacy-safe point assignment and per-boundary aggregation. */
function _compilePointAggregation(
  options: Readonly<CompileOptions>,
  sourceSql: string,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  const boundary = options.metadata.boundary;
  if (binding?.type !== "aggregatePointsToBoundaries" || !boundary) {
    throw new Error("Resolved point aggregation metadata is required");
  }
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const boundaryParser = _buildSimplifiedGeometry(
    buildGeometryExpression(
      quoteSqlIdentifier(boundary.geometryColumnName),
      boundary.geometryEncoding,
    ),
    boundary.simplification,
    options,
  );
  const pointParser = _buildPointExpression(binding.points, options.metadata);
  const displayName =
    boundary.displayNameColumnName ?
      quoteSqlIdentifier(boundary.displayNameColumnName)
    : quoteSqlIdentifier(boundary.keyColumnName);
  const minimumCount =
    options.layer.sensitivity.mode === "aggregateOnly" ?
      options.layer.sensitivity.minCellCount
    : 0;
  if (options.metadata.normalizationDenominator?.type === "queryColumn") {
    throw new Error("Point aggregation requires a boundary denominator");
  }
  const boundaryDenominator = options.metadata.normalizationDenominator;
  const boundaryDenominatorSelect =
    boundaryDenominator?.type === "boundaryColumn" ?
      `, ${quoteSqlIdentifier(boundaryDenominator.columnName)} AS ${quoteSqlIdentifier(MapLayerSpatialFeatureProperties.denominator)}`
    : "";
  const reportableDenominator =
    boundaryDenominator?.type === "boundaryColumn" ?
      quoteSqlIdentifier(MapLayerSpatialFeatureProperties.denominator)
    : "NULL";
  const rawSql = `WITH source_rows AS (${sourceSql}),
parsed_points AS (
  SELECT row_number() OVER () AS point_id, source_rows.*,
    ${pointParser} AS point_geometry FROM source_rows
),
boundary_rows AS (
  SELECT row_number() OVER () AS boundary_feature_id,
    ${displayName} AS boundary_name, ${boundaryParser} AS ${geometry}${boundaryDenominatorSelect}
  FROM ${quoteSqlIdentifier(boundary.datasetId)}
),
point_boundary_candidates AS (
  SELECT point_id, boundary_feature_id FROM parsed_points, boundary_rows
  WHERE point_geometry IS NOT NULL AND ${geometry} IS NOT NULL
    AND ST_Within(point_geometry, ${geometry})
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
    ${_buildPointAggregateValue(binding.aggregation, options.metadata)} AS aggregate_value
  FROM assigned_points GROUP BY boundary_feature_id
),
classified_areas AS (
  SELECT boundary_rows.*, contributor_count,
    CASE WHEN contributor_count < ${minimumCount} THEN 'suppressed'
      WHEN contributor_count IS NULL THEN 'noData' ELSE 'value' END AS state,
    CASE WHEN contributor_count < ${minimumCount} THEN NULL
      WHEN contributor_count IS NULL THEN NULL ELSE aggregate_value END AS reportable_value
  FROM boundary_rows LEFT JOIN area_values USING (boundary_feature_id)
),
spatial_diagnostics AS (
  SELECT count(*) FILTER (WHERE coalesce(boundary_match_count, 0) = 0) AS outside_boundary_count,
    count(*) FILTER (WHERE boundary_match_count > 1) AS overlap_count
  FROM parsed_points LEFT JOIN point_match_counts USING (point_id)
),
feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${geometry})),
    'properties', CASE WHEN state = 'suppressed' THEN json_object(
        '${MapLayerSpatialFeatureProperties.featureId}', boundary_feature_id,
        '${MapLayerSpatialFeatureProperties.boundaryName}', boundary_name,
        '${MapLayerSpatialFeatureProperties.state}', state)
      ELSE json_object(
        '${MapLayerSpatialFeatureProperties.featureId}', boundary_feature_id,
        '${MapLayerSpatialFeatureProperties.boundaryName}', boundary_name,
        '${MapLayerSpatialFeatureProperties.state}', state,
        '${MapLayerSpatialFeatureProperties.value}', reportable_value,
        '${MapLayerSpatialFeatureProperties.denominator}', ${reportableDenominator},
        '${MapLayerSpatialFeatureProperties.contributorCount}', contributor_count)
      END) AS feature
  FROM classified_areas
),
diagnostic_summary AS (
  SELECT count(*) AS source_count, count(point_geometry) AS parsed_count,
    count(*) FILTER (WHERE point_geometry IS NULL) AS invalid_count,
    ['point'] AS observed_families, false AS has_mixed_families
  FROM parsed_points
)
SELECT json_object('type', 'FeatureCollection',
    'features', coalesce((SELECT json_group_array(feature) FROM feature_rows), json('[]')))
    AS ${quoteSqlIdentifier(MapLayerSpatialQueryColumns.featureCollection)},
  json_object('sourceCount', source_count, 'parsedCount', parsed_count,
    'invalidCount', invalid_count, 'observedFamilies', to_json(observed_families),
    'hasMixedFamilies', has_mixed_families,
    'outsideBoundaryCount', outside_boundary_count, 'overlapCount', overlap_count,
    'suppressedCount', (SELECT count(*) FROM classified_areas WHERE state = 'suppressed'))
    AS ${quoteSqlIdentifier(MapLayerSpatialQueryColumns.diagnostics)}
FROM diagnostic_summary CROSS JOIN spatial_diagnostics`;
  return {
    rawSql,
    family: "polygon",
    sourcePropertyColumnNames: [],
    zoomBand: options.zoomBand,
    simplificationReferenceLatitude: options.simplificationReferenceLatitude,
  };
}

/**
 * Derives the analysis CRS for a grid from the point set's centroid.
 *
 * `sizeMeters` cannot be applied in EPSG:4326, and Web Mercator meters shrink
 * toward the poles, so cells there would not share one ground size. The CASE
 * mirrors `getUtmEpsgFromLongitudeLatitude`, whose constants it reuses.
 */
function _buildMetersCrsExpression(): string {
  const zone =
    "least(60, greatest(1, CAST(floor((centroid_longitude + 180) / 6) AS BIGINT) + 1))";
  const epsg =
    `CASE WHEN centroid_latitude >= 84 THEN ${PolarEpsg.north} ` +
    `WHEN centroid_latitude <= -80 THEN ${PolarEpsg.south} ` +
    `WHEN centroid_latitude >= 0 THEN ${UtmEpsgBase.north} + ${zone} ` +
    `ELSE ${UtmEpsgBase.south} + ${zone} END`;
  return `concat('EPSG:', CAST(${epsg} AS BIGINT))`;
}

/** Builds point parsing, the analysis CRS, cell assignment, and aggregation. */
function _buildGridCellCtes(
  options: Readonly<CompileOptions>,
  sourceSql: string,
  binding: MapLayer.GridBinBinding,
): string {
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  const pointParser = _buildPointExpression(binding.points, options.metadata);
  const cell = buildGridCellExpressions({
    grid: binding.grid,
    xExpression: "projected_x",
    yExpression: "projected_y",
    sizeMeters: binding.sizeMeters,
  });
  const denominator = options.metadata.normalizationDenominator;
  if (denominator?.type === "boundaryColumn") {
    throw new Error("Grid bins cannot use a boundary denominator");
  }
  const summedDenominator =
    denominator ?
      `,\n    sum(${quoteSqlIdentifier(denominator.columnName)}) AS ${quoteSqlIdentifier(MapLayerSpatialFeatureProperties.denominator)}`
    : "";
  return `source_rows AS (${sourceSql}),
parsed_points AS (
  SELECT source_rows.*, ${pointParser} AS point_geometry FROM source_rows
),
typed_points AS (
  SELECT parsed_points.*, ${_buildFamilyExpression("point_geometry")} AS ${family}
  FROM parsed_points
),
point_rows AS (
  SELECT * FROM typed_points
  WHERE point_geometry IS NOT NULL AND ${family} = 'point'
),
grid_crs AS (
  SELECT ${_buildMetersCrsExpression()} AS meters_crs
  FROM (
    SELECT avg(ST_X(point_geometry)) AS centroid_longitude,
      avg(ST_Y(point_geometry)) AS centroid_latitude
    FROM point_rows
  ) centroid
),
projected_points AS (
  SELECT point_rows.*, meters_crs,
    ST_Transform(point_geometry, 'EPSG:4326', meters_crs, always_xy := true) AS projected_geometry
  FROM point_rows CROSS JOIN grid_crs
),
projected_coordinates AS (
  SELECT projected_points.*, ST_X(projected_geometry) AS projected_x,
    ST_Y(projected_geometry) AS projected_y
  FROM projected_points
),
binned_points AS (
  SELECT projected_coordinates.*, ${cell.cellIdExpression} AS cell_id,
    ${cell.geometryExpression} AS cell_geometry
  FROM projected_coordinates
),
cell_values AS (
  SELECT cell_id, any_value(cell_geometry) AS cell_geometry,
    any_value(meters_crs) AS meters_crs, count(*) AS contributor_count,
    ${_buildPointAggregateValue(binding.aggregation, options.metadata)} AS aggregate_value${summedDenominator}
  FROM binned_points GROUP BY cell_id
)`;
}

/** Builds cell classification, suppression, features, and diagnostics. */
function _buildGridBinOutput(options: Readonly<CompileOptions>): string {
  const properties = MapLayerSpatialFeatureProperties;
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  const minimumCount =
    options.layer.sensitivity.mode === "aggregateOnly" ?
      options.layer.sensitivity.minCellCount
    : 0;
  const hasDenominator =
    options.metadata.normalizationDenominator !== undefined;
  const denominatorAlias = quoteSqlIdentifier(properties.denominator);
  return `classified_cells AS (
  SELECT row_number() OVER (ORDER BY cell_id) AS cell_feature_id, cell_id,
    contributor_count,${hasDenominator ? ` ${denominatorAlias},` : ""}
    CASE WHEN contributor_count < ${minimumCount} THEN 'suppressed'
      WHEN aggregate_value IS NULL THEN 'noData' ELSE 'value' END AS state,
    CASE WHEN contributor_count < ${minimumCount} THEN NULL
      ELSE aggregate_value END AS reportable_value,
    ${_buildSimplifiedGeometry(
      "ST_Transform(cell_geometry, meters_crs, 'EPSG:4326', always_xy := true)",
      GRID_CELL_SIMPLIFICATION,
      options,
    )} AS ${geometry}
  FROM cell_values
),
feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${geometry})),
    'properties', CASE WHEN state = 'suppressed' THEN json_object(
        '${properties.featureId}', cell_feature_id,
        '${properties.boundaryName}', cell_id,
        '${properties.state}', state)
      ELSE json_object(
        '${properties.featureId}', cell_feature_id,
        '${properties.boundaryName}', cell_id,
        '${properties.state}', state,
        '${properties.value}', reportable_value,
        '${properties.denominator}', ${hasDenominator ? denominatorAlias : "NULL"},
        '${properties.contributorCount}', contributor_count)
      END) AS feature
  FROM classified_cells
),
diagnostic_summary AS (
  SELECT count(*) AS source_count, count(point_geometry) AS parsed_count,
    count(*) FILTER (WHERE point_geometry IS NULL) AS invalid_count,
    list_distinct(list(${family}) FILTER (WHERE ${family} IS NOT NULL)) AS observed_families,
    count(DISTINCT ${family}) FILTER (WHERE ${family} IS NOT NULL) > 1 AS has_mixed_families,
    count(*) FILTER (WHERE point_geometry IS NOT NULL AND ${family} <> 'point') AS non_point_count
  FROM typed_points
)
SELECT json_object('type', 'FeatureCollection',
    'features', coalesce((SELECT json_group_array(feature) FROM feature_rows), json('[]')))
    AS ${quoteSqlIdentifier(MapLayerSpatialQueryColumns.featureCollection)},
  json_object('sourceCount', source_count, 'parsedCount', parsed_count,
    'invalidCount', invalid_count,
    'observedFamilies', coalesce(to_json(observed_families), json('[]')),
    'hasMixedFamilies', has_mixed_families, 'nonPointCount', non_point_count,
    'suppressedCount', (SELECT count(*) FROM classified_cells WHERE state = 'suppressed'),
    'isEmptyAfterDrops', (SELECT count(*) FROM point_rows) = 0)
    AS ${quoteSqlIdentifier(MapLayerSpatialQueryColumns.diagnostics)}
FROM diagnostic_summary`;
}

/** Compiles fixed-size grid binning of source points in a meters CRS. */
function _compileGridBin(
  options: Readonly<CompileOptions>,
  sourceSql: string,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  if (binding?.type !== "binPointsToGrid") {
    throw new Error("A grid-bin binding is required");
  }
  return {
    rawSql:
      `WITH ${_buildGridCellCtes(options, sourceSql, binding)},\n` +
      _buildGridBinOutput(options),
    family: "polygon",
    sourcePropertyColumnNames: [],
    zoomBand: options.zoomBand,
    simplificationReferenceLatitude: options.simplificationReferenceLatitude,
  };
}

/** Compiles one supported spatial layer to a one-row result envelope. */
export function compileMapLayerSpatialQuery(
  options: Readonly<CompileOptions>,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  const sourceSql = structuredQueryToSql(options.layer.source);
  if (!sourceSql) {
    throw new Error("The layer source query is incomplete");
  }
  if (binding?.type === "geometryColumn") {
    return _compileGeometryColumn(options, sourceSql);
  }
  if (binding?.type === "joinToBoundaries") {
    return _compileBoundaryJoin(options, sourceSql);
  }
  if (binding?.type === "aggregatePointsToBoundaries") {
    return _compilePointAggregation(options, sourceSql);
  }
  if (binding?.type === "binPointsToGrid") {
    return _compileGridBin(options, sourceSql);
  }
  throw new Error("The spatial binding is not supported by this compiler");
}
