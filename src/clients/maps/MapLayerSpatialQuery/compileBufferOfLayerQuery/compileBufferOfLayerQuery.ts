import { propEq } from "@avandar/utils";
import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { hasBufferCycle } from "$/models/AvaMap/AvaMapConfig/hasBufferCycle";
import { isBufferOfDisplacedPoints } from "$/models/AvaMap/AvaMapConfig/isBufferOfDisplacedPoints/isBufferOfDisplacedPoints";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import { compileLatLngLayerSourceSql } from "../compileLatLngLayerSourceSql/compileLatLngLayerSourceSql";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { makeSpatialQueryPlan } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQueryHelpers";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeJsonPointerFromPropertyName,
} from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import { makeMetersCrsSql } from "../makeMetersCrsSql";
import { MapLayerSpatialQueryColumns } from "../MapLayerSpatialQuery.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { CompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerFeatureSource } from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";

function _getBufferBinding(layer: MapLayer.T): MapLayer.BufferOfLayerBinding {
  const binding = layer.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    throw new Error("A buffer-of-layer binding is required");
  }
  return binding;
}

function _getSourceLayer(
  stack: readonly MapLayer.T[],
  sourceId: MapLayer.Id,
): MapLayer.T {
  const source = stack.find(propEq("id", sourceId));
  if (!source) {
    throw new Error("Buffer source layer is missing");
  }
  return source;
}

function _assertBufferInvariants(
  options: Readonly<CompileOptions>,
  source: MapLayer.T,
): void {
  if (hasBufferCycle(options.stack, options.layer.id)) {
    throw new Error("Buffer layer chain contains a cycle");
  }
  if (options.layer.sensitivity.mode !== source.sensitivity.mode) {
    throw new Error("Buffer sensitivity must match the source layer");
  }
  // Rings around a displaced layer's exact points would reveal them, whether
  // drawn, used as a spatial filter, or listed.
  if (isBufferOfDisplacedPoints(options.stack, options.layer.id)) {
    throw new SensitivityViolationError(
      "jitterRequiresPoints",
      options.layer.name,
    );
  }
}

/** The source column each ring carries, or none for dissolved rings. */
function _getLabelColumn(
  source: MapLayer.T,
  binding: MapLayer.BufferOfLayerBinding,
): QueryColumn.T | undefined {
  if (!binding.labelColumn || binding.dissolve) {
    return undefined;
  }
  return source.source.queryColumns.find(propEq("id", binding.labelColumn));
}

/** The buffer source's features, with the label column among its properties. */
function _compileSourceFeatures(
  options: Readonly<CompileOptions>,
  source: MapLayer.T,
  labelColumn: QueryColumn.T | undefined,
): MapLayerFeatureSource {
  if (source.geoBinding?.type === "latLngColumns") {
    const rows = compileLatLngLayerSourceSql({
      layer: source,
      overlay: options.overlay,
      spatialFilterEnvelopeSql: undefined,
    });
    if (!rows) {
      throw new Error("Buffer source coordinates are incomplete");
    }
    return rows;
  }
  const labelledSource: MapLayer.T = labelColumn
    ? { ...source, popup: { ...source.popup, columnIds: [labelColumn.id] } }
    : source;
  return {
    type: "envelope",
    sql: compileMapLayerSpatialQuery({ ...options, layer: labelledSource })
      .rawSql,
  };
}

function _buildProjectedSql(labelColumnName: string | undefined): string {
  const labelSql = labelColumnName
    ? `json_extract_string(properties, ${quoteSqlLiteral(makeJsonPointerFromPropertyName(labelColumnName))})`
    : "CAST(NULL AS VARCHAR)";
  return `buffer_crs AS (
  SELECT ${makeMetersCrsSql()} AS meters_crs
  FROM (
    SELECT avg(ST_X(ST_Centroid(geom))) AS centroid_longitude,
      avg(ST_Y(ST_Centroid(geom))) AS centroid_latitude
    FROM source_features
  ) centroid
),
projected AS (
  SELECT ST_Transform(
    geom, 'EPSG:4326', meters_crs, always_xy := true
  ) AS geom, meters_crs, ${labelSql} AS label
  FROM source_features, buffer_crs
)`;
}

function _buildBufferedSql(distanceMeters: number): string {
  return `buffered AS (
  SELECT ST_Transform(
    ST_Buffer(geom, ${distanceMeters}),
    meters_crs, 'EPSG:4326', always_xy := true
  ) AS geom, label
  FROM projected
)`;
}

function _buildOutputGeomsSql(dissolve: boolean): string {
  if (dissolve) {
    return `output_geoms AS (
  SELECT ST_Union_Agg(geom) AS geom, CAST(NULL AS VARCHAR) AS label
  FROM buffered
)`;
  }
  return `output_geoms AS (
  SELECT geom, label FROM buffered
)`;
}

function _buildBufferEnvelopeSelect(
  labelColumnName: string | undefined,
): string {
  const featureAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnosticAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  const propertiesSql = labelColumnName
    ? `json_object(${quoteSqlLiteral(labelColumnName)}, label)`
    : "json_object()";
  return `feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(geom)),
    'properties', ${propertiesSql}) AS feature
  FROM output_geoms
  WHERE geom IS NOT NULL
),
diagnostic_summary AS (
  SELECT count(*) AS source_count,
    count(geom) AS parsed_count,
    count(*) FILTER (WHERE geom IS NULL) AS invalid_count
  FROM source_features
)
SELECT json_object('type', 'FeatureCollection',
  'features', coalesce((SELECT json_group_array(feature) FROM feature_rows), json('[]')))
  AS ${featureAlias},
json_object('sourceCount', source_count, 'parsedCount', parsed_count,
  'invalidCount', invalid_count,
  'observedFamilies', json('["polygon"]'),
  'hasMixedFamilies', false)
  AS ${diagnosticAlias}
FROM diagnostic_summary`;
}

function _buildBufferSql(
  options: Readonly<{
    featureSource: MapLayerFeatureSource;
    binding: MapLayer.BufferOfLayerBinding;
    labelColumnName: string | undefined;
  }>,
): string {
  return `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "source_features", source: options.featureSource })},
${_buildProjectedSql(options.labelColumnName)},
${_buildBufferedSql(options.binding.distanceMeters)},
${_buildOutputGeomsSql(options.binding.dissolve)},
${_buildBufferEnvelopeSelect(options.labelColumnName)}`;
}

/**
 * Compiles a buffer-of-layer binding as polygons in a derived meters CRS.
 * Point, line, polygon, and latitude and longitude sources all buffer. When
 * rings are not dissolved and the binding names a label column, each ring
 * carries that source value as its one property.
 */
export function compileBufferOfLayerQuery(
  options: Readonly<CompileOptions>,
): MapLayerSpatialQueryPlan {
  const binding = _getBufferBinding(options.layer);
  const source = _getSourceLayer(options.stack, binding.layerId);
  _assertBufferInvariants(options, source);
  const labelColumn = _getLabelColumn(source, binding);
  const labelColumnName = labelColumn
    ? QueryColumn.getDerivedColumnName(labelColumn)
    : undefined;
  return makeSpatialQueryPlan({
    compile: options,
    rawSql: _buildBufferSql({
      featureSource: _compileSourceFeatures(options, source, labelColumn),
      binding,
      labelColumnName,
    }),
    family: "polygon",
    sourcePropertyColumnNames: labelColumnName ? [labelColumnName] : [],
  });
}
