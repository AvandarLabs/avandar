import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";
import type {
  CompileOptions,
  CompileSourceOptions,
} from "./compileMapLayerSpatialQuery.types";

import { quoteSqlIdentifier } from "@avandar/utils/sql";

import {
  makeOutputAoiPredicateSql,
  makeSourceAoiPredicateSql,
} from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { makeGridCellExpressionsFromGrid } from "../makeGridCellExpressionsFromGrid/makeGridCellExpressionsFromGrid";
import { makeMetersCrsSql } from "../makeMetersCrsSql";
import {
  MapLayerSpatialFeatureProperties,
  MapLayerSpatialQueryColumns,
} from "../MapLayerSpatialQuery.constants";
import {
  FAMILY_COLUMN,
  GEOMETRY_COLUMN,
  GRID_CELL_SIMPLIFICATION,
} from "./compileMapLayerSpatialQuery.constants";
import {
  getAppliedAoiFromCompileOptions,
  makeFamilyExpressionFromGeometrySql,
  makePointAggregateValueSql,
  makePointExpressionFromBinding,
  makeSimplifiedGeometrySql,
  makeSpatialQueryPlan,
  makeSuppressedAreaFeatureSql,
} from "./compileMapLayerSpatialQueryHelpers";

function _buildGridDenominatorSelect(
  metadata: CompileOptions["metadata"],
): string {
  const denominator = metadata.normalizationDenominator;
  if (denominator?.type === "boundaryColumn") {
    throw new Error("Grid bins cannot use a boundary denominator");
  }
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.denominator,
  );
  return denominator
    ? `,\n    sum(${quoteSqlIdentifier(denominator.columnName)}) AS ${alias}`
    : "";
}

function _buildGridPointCtes(options: {
  sourceSql: string;
  pointParser: string;
  family: string;
  aoi: AvaMapConfig.AoiPolygon | undefined;
}): string {
  const { sourceSql, pointParser, family, aoi } = options;
  const sourceAoiWhere = aoi
    ? ` AND ${makeSourceAoiPredicateSql("point_geometry", aoi)}`
    : "";
  return `source_rows AS (${sourceSql}),
parsed_points AS (
  SELECT source_rows.*, ${pointParser} AS point_geometry FROM source_rows
),
typed_points AS (
  SELECT parsed_points.*, ${makeFamilyExpressionFromGeometrySql("point_geometry")} AS ${family}
  FROM parsed_points
),
point_rows AS (
  SELECT * FROM typed_points
  WHERE point_geometry IS NOT NULL AND ${family} = 'point'${sourceAoiWhere}
)`;
}

function _buildGridProjectionCtes(): string {
  return `grid_crs AS (
  SELECT ${makeMetersCrsSql()} AS meters_crs
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
)`;
}

function _buildGridBinningCtes(options: {
  cell: ReturnType<typeof makeGridCellExpressionsFromGrid>;
  aggregationSql: string;
  summedDenominator: string;
}): string {
  const { cell, aggregationSql, summedDenominator } = options;
  return `binned_points AS (
  SELECT projected_coordinates.*, ${cell.cellIdExpression} AS cell_id,
    ${cell.geometryExpression} AS cell_geometry
  FROM projected_coordinates
),
cell_values AS (
  SELECT cell_id, any_value(cell_geometry) AS cell_geometry,
    any_value(meters_crs) AS meters_crs, count(*) AS contributor_count,
    ${aggregationSql} AS aggregate_value${summedDenominator}
  FROM binned_points GROUP BY cell_id
)`;
}

function _buildGridCellCtes(
  options: Readonly<
    CompileSourceOptions & { binding: MapLayer.GridBinBinding }
  >,
): string {
  const { binding } = options;
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  const cell = makeGridCellExpressionsFromGrid({
    grid: binding.grid,
    xExpression: "projected_x",
    yExpression: "projected_y",
    sizeMeters: binding.sizeMeters,
  });
  return `${_buildGridPointCtes({
    sourceSql: options.sourceSql,
    pointParser: makePointExpressionFromBinding({
      points: binding.points,
      metadata: options.metadata,
    }),
    family,
    aoi: getAppliedAoiFromCompileOptions(options),
  })},
${_buildGridProjectionCtes()},
${_buildGridBinningCtes({
  cell,
  aggregationSql: makePointAggregateValueSql({
    aggregation: binding.aggregation,
    metadata: options.metadata,
  }),
  summedDenominator: _buildGridDenominatorSelect(options.metadata),
})}`;
}

function _getMinimumContributorCount(layer: MapLayer.T): number {
  return layer.sensitivity.mode === "aggregateOnly"
    ? layer.sensitivity.minCellCount
    : 0;
}

function _buildClassifiedCellsCte(options: {
  compile: CompileOptions;
  hasDenominator: boolean;
  denominatorAlias: string;
}): string {
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const minimumCount = _getMinimumContributorCount(options.compile.layer);
  const simplifiedGeometry = makeSimplifiedGeometrySql({
    geometrySql:
      "ST_Transform(cell_geometry, meters_crs, 'EPSG:4326', always_xy := true)",
    simplification: GRID_CELL_SIMPLIFICATION,
    zoomBand: options.compile.zoomBand,
    simplificationReferenceLatitude:
      options.compile.simplificationReferenceLatitude,
  });
  return `classified_cells AS (
  SELECT row_number() OVER (ORDER BY cell_id) AS cell_feature_id, cell_id,
    contributor_count,${options.hasDenominator ? ` ${options.denominatorAlias},` : ""}
    CASE WHEN contributor_count < ${minimumCount} THEN 'suppressed'
      WHEN aggregate_value IS NULL THEN 'noData' ELSE 'value' END AS state,
    CASE WHEN contributor_count < ${minimumCount} THEN NULL
      ELSE aggregate_value END AS reportable_value,
    ${simplifiedGeometry} AS ${geometry}
  FROM cell_values
)`;
}

function _buildGridFeatureRowsCte(options: {
  hasDenominator: boolean;
  denominatorAlias: string;
  aoi: AvaMapConfig.AoiPolygon | undefined;
}): string {
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const outputAoiWhere = options.aoi
    ? `\n  WHERE ${makeOutputAoiPredicateSql(geometry, options.aoi)}`
    : "";
  return `feature_rows AS (
  SELECT ${makeSuppressedAreaFeatureSql({
    geometrySql: geometry,
    featureIdSql: "cell_feature_id",
    nameSql: "cell_id",
    denominatorSql: options.hasDenominator ? options.denominatorAlias : "NULL",
    contributorCountSql: "contributor_count",
  })} AS feature
  FROM classified_cells${outputAoiWhere}
)`;
}

function _buildGridDiagnosticSummaryCte(): string {
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  return `diagnostic_summary AS (
  SELECT count(*) AS source_count, count(point_geometry) AS parsed_count,
    count(*) FILTER (WHERE point_geometry IS NULL) AS invalid_count,
    list_distinct(list(${family}) FILTER (WHERE ${family} IS NOT NULL)) AS observed_families,
    count(DISTINCT ${family}) FILTER (WHERE ${family} IS NOT NULL) > 1 AS has_mixed_families,
    count(*) FILTER (WHERE point_geometry IS NOT NULL AND ${family} <> 'point') AS non_point_count
  FROM typed_points
)`;
}

function _buildGridBinSelect(): string {
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
    'invalidCount', invalid_count,
    'observedFamilies', coalesce(to_json(observed_families), json('[]')),
    'hasMixedFamilies', has_mixed_families, 'nonPointCount', non_point_count,
    'suppressedCount', (SELECT count(*) FROM classified_cells WHERE state = 'suppressed'),
    'isEmptyAfterDrops', (SELECT count(*) FROM point_rows) = 0)
    AS ${diagnosticAlias}
FROM diagnostic_summary`;
}

function _buildGridBinOutput(options: Readonly<CompileOptions>): string {
  const hasDenominator =
    options.metadata.normalizationDenominator !== undefined;
  const denominatorAlias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.denominator,
  );
  return `${_buildClassifiedCellsCte({
    compile: options,
    hasDenominator,
    denominatorAlias,
  })},
${_buildGridFeatureRowsCte({
  hasDenominator,
  denominatorAlias,
  aoi: getAppliedAoiFromCompileOptions(options),
})},
${_buildGridDiagnosticSummaryCte()}
${_buildGridBinSelect()}`;
}

/** Compiles fixed-size grid binning of source points in a meters CRS. */
export function compileGridBinQuery(
  options: Readonly<CompileSourceOptions>,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  if (binding?.type !== "binPointsToGrid") {
    throw new Error("A grid-bin binding is required");
  }
  const rawSql = `WITH ${_buildGridCellCtes({ ...options, binding })},
${_buildGridBinOutput(options)}`;
  return makeSpatialQueryPlan({
    compile: options,
    rawSql,
    family: "polygon",
    sourcePropertyColumnNames: [],
  });
}
