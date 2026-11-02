import { isDefined, prop } from "@avandar/utils";
import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import {
  makeOutputAoiPredicateSql,
  makeSourceAoiPredicateSql,
} from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { makeGeometryExpressionFromValueExpression } from "../makeGeometryExpressionFromValueExpression/makeGeometryExpressionFromValueExpression";
import { makeSourceCrsTransformFromGeometrySql } from "../makeSourceCrsTransformFromGeometrySql/makeSourceCrsTransformFromGeometrySql";
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
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";
import type { CompileSourceOptions } from "./compileMapLayerSpatialQuery.types";

type GeometryColumnBinding = Extract<
  MapLayer.GeoBinding,
  { type: "geometryColumn" }
>;

/** Builds the selected popup properties for a direct geometry layer. */
function _getPropertyColumnNames(options: {
  layer: MapLayer.T;
  metadata: CompileSourceOptions["metadata"];
}): string[] {
  const { layer, metadata } = options;
  const geometryColumnId =
    layer.geoBinding?.type === "geometryColumn"
      ? layer.geoBinding.column
      : undefined;
  const selectedIds =
    layer.popup.columnIds === "all"
      ? layer.source.queryColumns.map(prop("id"))
      : layer.popup.columnIds;
  const columnNames = selectedIds
    .filter((columnId) => {
      return columnId !== geometryColumnId;
    })
    .map((columnId) => {
      return metadata.sourceColumnNames.get(columnId);
    })
    .filter(isDefined);
  const disputedStatusColumnName =
    metadata.disputedStatusColumn?.type === "queryColumn"
      ? metadata.disputedStatusColumn.columnName
      : undefined;
  return disputedStatusColumnName &&
    !columnNames.includes(disputedStatusColumnName)
    ? [...columnNames, disputedStatusColumnName]
    : columnNames;
}

/** Builds a DuckDB JSON object expression for selected source properties. */
function _buildPropertiesExpression(options: {
  columnNames: readonly string[];
  denominatorColumnName?: string;
  disputedStatusColumnName?: string;
}): string {
  const { columnNames, denominatorColumnName, disputedStatusColumnName } =
    options;
  if (
    columnNames.length === 0 &&
    !denominatorColumnName &&
    !disputedStatusColumnName
  ) {
    return "json_object()";
  }
  const columnEntries = columnNames.flatMap((columnName) => {
    return [quoteSqlLiteral(columnName), quoteSqlIdentifier(columnName)];
  });
  const denominatorEntries = denominatorColumnName
    ? [
        quoteSqlLiteral(MapLayerSpatialFeatureProperties.denominator),
        quoteSqlIdentifier(denominatorColumnName),
      ]
    : [];
  const disputedStatusEntries = disputedStatusColumnName
    ? [
        quoteSqlLiteral(MapLayerSpatialFeatureProperties.disputedStatus),
        quoteSqlIdentifier(disputedStatusColumnName),
      ]
    : [];
  return `json_object(${[...columnEntries, ...denominatorEntries, ...disputedStatusEntries].join(", ")})`;
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

function _getGeometryColumnBinding(layer: MapLayer.T): GeometryColumnBinding {
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    throw new Error("A geometry-column binding is required");
  }
  return binding;
}

function _getGeometryColumnName(options: {
  binding: GeometryColumnBinding;
  metadata: CompileSourceOptions["metadata"];
}): string {
  const geometryColumnName = options.metadata.sourceColumnNames.get(
    options.binding.column,
  );
  if (!geometryColumnName) {
    throw new Error("The geometry column could not be resolved");
  }
  return geometryColumnName;
}

function _buildGeometryColumnParser(options: {
  binding: GeometryColumnBinding;
  geometryColumnName: string;
  compile: CompileSourceOptions;
}): string {
  const { binding, geometryColumnName, compile } = options;
  return makeSimplifiedGeometrySql({
    geometrySql: makeSourceCrsTransformFromGeometrySql({
      geometrySql: makeGeometryExpressionFromValueExpression({
        valueExpression: quoteSqlIdentifier(geometryColumnName),
        encoding: binding.encoding,
      }),
      sourceCrs: binding.sourceCrs,
    }),
    simplification:
      binding.family === "point" ? undefined : binding.simplification,
    zoomBand: compile.zoomBand,
    simplificationReferenceLatitude: compile.simplificationReferenceLatitude,
  });
}

function _buildParsedRowsCte(options: {
  parser: string;
  geometry: string;
}): string {
  return `parsed_rows AS (
  SELECT source_rows.*, ${options.parser} AS ${options.geometry} FROM source_rows
)`;
}

function _buildGeometryColumnSql(options: {
  sourceSql: string;
  parser: string;
  familyLiteral: string;
  properties: readonly string[];
  denominatorColumnName: string | undefined;
  disputedStatusColumnName: string | undefined;
  aoi: AvaMapConfig.AoiPolygon | undefined;
}): string {
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  const propertiesSql = _buildPropertiesExpression({
    columnNames: options.properties,
    denominatorColumnName: options.denominatorColumnName,
    disputedStatusColumnName: options.disputedStatusColumnName,
  });
  const sourceAoiWhere = options.aoi
    ? `\n    AND ${makeSourceAoiPredicateSql(geometry, options.aoi)}`
    : "";
  const outputAoiWhere = options.aoi
    ? `\n    AND ${makeOutputAoiPredicateSql(geometry, options.aoi)}`
    : "";
  return `WITH source_rows AS (${options.sourceSql}),
${_buildParsedRowsCte({
  parser: options.parser,
  geometry,
})},
typed_rows AS (
  SELECT parsed_rows.*, ${makeFamilyExpressionFromGeometrySql(geometry)} AS ${family} FROM parsed_rows
),
${_buildDiagnosticSummary()},
feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${geometry})),
    'properties', ${propertiesSql}) AS feature
  FROM typed_rows
  WHERE ${family} = ${quoteSqlLiteral(options.familyLiteral)}
    AND (SELECT has_mixed_families FROM diagnostic_summary) = false${sourceAoiWhere}${outputAoiWhere}
)
${_buildFinalSelect()}`;
}

/** Compiles a direct geometry-column layer. */
export function compileGeometryColumnQuery(
  options: Readonly<CompileSourceOptions>,
): MapLayerSpatialQueryPlan {
  const binding = _getGeometryColumnBinding(options.layer);
  const geometryColumnName = _getGeometryColumnName({
    binding,
    metadata: options.metadata,
  });
  const properties = _getPropertyColumnNames({
    layer: options.layer,
    metadata: options.metadata,
  });
  const denominatorColumnName =
    options.metadata.normalizationDenominator?.type === "queryColumn"
      ? options.metadata.normalizationDenominator.columnName
      : undefined;
  const disputedStatusColumnName =
    options.metadata.disputedStatusColumn?.type === "queryColumn"
      ? options.metadata.disputedStatusColumn.columnName
      : undefined;
  return makeSpatialQueryPlan({
    compile: options,
    rawSql: _buildGeometryColumnSql({
      sourceSql: options.sourceSql,
      parser: _buildGeometryColumnParser({
        binding,
        geometryColumnName,
        compile: options,
      }),
      familyLiteral: binding.family,
      properties,
      denominatorColumnName,
      disputedStatusColumnName,
      aoi: getAppliedAoiFromCompileOptions(options),
    }),
    family: binding.family,
    sourcePropertyColumnNames: properties,
  });
}
