import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { CompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";

import { propEq } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";

import { hasBufferCycle } from "$/models/AvaMap/AvaMapConfig/hasBufferCycle";

import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { makeSpatialQueryPlan } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQueryHelpers";
import { makeMetersCrsSql } from "../makeMetersCrsSql";
import { MapLayerSpatialQueryColumns } from "../MapLayerSpatialQuery.constants";

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
}

function _buildSourceFeaturesSql(
  sourceSql: string,
  featureCollectionColumn: string,
): string {
  return `source_envelope AS (
  ${sourceSql}
),
source_features AS (
  SELECT ST_GeomFromGeoJSON(
    json_extract_string(feature.value, '$.geometry')
  ) AS geom
  FROM source_envelope,
    json_each(
      json_extract(
        source_envelope.${featureCollectionColumn},
        '$.features'
      )
    ) AS feature
)`;
}

function _buildProjectedSql(): string {
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
  ) AS geom, meters_crs
  FROM source_features, buffer_crs
)`;
}

function _buildBufferedSql(distanceMeters: number): string {
  return `buffered AS (
  SELECT ST_Transform(
    ST_Buffer(geom, ${distanceMeters}),
    meters_crs, 'EPSG:4326', always_xy := true
  ) AS geom
  FROM projected
)`;
}

function _buildOutputGeomsSql(dissolve: boolean): string {
  if (dissolve) {
    return `output_geoms AS (
  SELECT ST_Union_Agg(geom) AS geom FROM buffered
)`;
  }
  return `output_geoms AS (
  SELECT geom FROM buffered
)`;
}

function _buildBufferEnvelopeSelect(): string {
  const featureAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnosticAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  return `feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(geom)),
    'properties', json_object()) AS feature
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
  sourcePlan: MapLayerSpatialQueryPlan,
  binding: MapLayer.BufferOfLayerBinding,
): string {
  const featureCollectionColumn = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  return `WITH ${_buildSourceFeaturesSql(sourcePlan.rawSql, featureCollectionColumn)},
${_buildProjectedSql()},
${_buildBufferedSql(binding.distanceMeters)},
${_buildOutputGeomsSql(binding.dissolve)},
${_buildBufferEnvelopeSelect()}`;
}

/**
 * Compiles a buffer-of-layer binding as polygons in a derived meters CRS.
 */
export function compileBufferOfLayerQuery(
  options: Readonly<CompileOptions>,
): MapLayerSpatialQueryPlan {
  const binding = _getBufferBinding(options.layer);
  const source = _getSourceLayer(options.stack, binding.layerId);
  _assertBufferInvariants(options, source);
  const sourcePlan = compileMapLayerSpatialQuery({
    ...options,
    layer: source,
  });
  return makeSpatialQueryPlan({
    compile: options,
    rawSql: _buildBufferSql(sourcePlan, binding),
    family: "polygon",
    sourcePropertyColumnNames: [],
  });
}
