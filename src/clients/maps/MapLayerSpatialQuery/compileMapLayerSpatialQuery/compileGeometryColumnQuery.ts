import { isDefined, prop } from "@avandar/utils";
import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
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
  makeFamilyExpressionFromGeometrySql,
  makeSimplifiedGeometrySql,
  makeSpatialQueryPlan,
} from "./compileMapLayerSpatialQueryHelpers";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";
import type { CompileSourceOptions } from "./compileMapLayerSpatialQuery.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

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
    layer.geoBinding?.type === "geometryColumn" ?
      layer.geoBinding.column
    : undefined;
  const selectedIds =
    layer.popup.columnIds === "all" ?
      layer.source.queryColumns.map(prop("id"))
    : layer.popup.columnIds;
  return selectedIds
    .filter((columnId) => {
      return columnId !== geometryColumnId;
    })
    .map((columnId) => {
      return metadata.sourceColumnNames.get(columnId);
    })
    .filter(isDefined);
}

/** Builds a DuckDB JSON object expression for selected source properties. */
function _buildPropertiesExpression(options: {
  columnNames: readonly string[];
  denominatorColumnName?: string;
}): string {
  const { columnNames, denominatorColumnName } = options;
  if (columnNames.length === 0 && !denominatorColumnName) {
    return "json_object()";
  }
  const columnEntries = columnNames.flatMap((columnName) => {
    return [quoteSqlLiteral(columnName), quoteSqlIdentifier(columnName)];
  });
  const denominatorEntries =
    denominatorColumnName ?
      [
        quoteSqlLiteral(MapLayerSpatialFeatureProperties.denominator),
        quoteSqlIdentifier(denominatorColumnName),
      ]
    : [];
  return `json_object(${[...columnEntries, ...denominatorEntries].join(", ")})`;
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

function _buildGeometryColumnSql(options: {
  sourceSql: string;
  parser: string;
  familyLiteral: string;
  properties: readonly string[];
  denominatorColumnName: string | undefined;
}): string {
  const geometry = quoteSqlIdentifier(GEOMETRY_COLUMN);
  const family = quoteSqlIdentifier(FAMILY_COLUMN);
  const propertiesSql = _buildPropertiesExpression({
    columnNames: options.properties,
    denominatorColumnName: options.denominatorColumnName,
  });
  return `WITH source_rows AS (${options.sourceSql}),
parsed_rows AS (
  SELECT source_rows.*, ${options.parser} AS ${geometry} FROM source_rows
),
typed_rows AS (
  SELECT parsed_rows.*, ${makeFamilyExpressionFromGeometrySql(geometry)} AS ${family} FROM parsed_rows
),
${_buildDiagnosticSummary()},
feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${geometry})),
    'properties', ${propertiesSql}) AS feature
  FROM typed_rows
  WHERE ${family} = ${quoteSqlLiteral(options.familyLiteral)}
    AND (SELECT has_mixed_families FROM diagnostic_summary) = false
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
    options.metadata.normalizationDenominator?.type === "queryColumn" ?
      options.metadata.normalizationDenominator.columnName
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
    }),
    family: binding.family,
    sourcePropertyColumnNames: properties,
  });
}
