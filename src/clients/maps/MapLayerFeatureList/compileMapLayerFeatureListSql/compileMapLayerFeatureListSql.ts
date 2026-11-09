import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeJsonPointerFromPropertyName,
} from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import { makeMetersCrsSql } from "@/clients/maps/MapLayerSpatialQuery/makeMetersCrsSql";
import { MAP_LAYER_FEATURE_LIST_SQL_COLUMNS } from "../MapLayerFeatureList.constants";
import type { MapLayerFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

/** Features each listed row is measured to, and the property naming each. */
export type MapLayerFeatureListNearestSource = {
  source: MapLayerFeatureSource;
  labelPropertyName: string | undefined;
};

function _buildListRowsCte(): string {
  return `list_rows AS (
  SELECT row_number() OVER () AS list_row_id, properties, geom
  FROM list_features
  WHERE geom IS NOT NULL
)`;
}

function _buildNearestCtes(nearest: MapLayerFeatureListNearestSource): string {
  const labelSql =
    nearest.labelPropertyName === undefined
      ? "CAST(NULL AS VARCHAR)"
      : `json_extract_string(nearest_features.properties, ${quoteSqlLiteral(makeJsonPointerFromPropertyName(nearest.labelPropertyName))})`;
  return `${makeFeaturesCteSqlFromFeatureSource({ cteName: "nearest_features", source: nearest.source })},
list_crs AS (
  SELECT ${makeMetersCrsSql()} AS meters_crs
  FROM (
    SELECT avg(ST_X(ST_Centroid(geom))) AS centroid_longitude,
      avg(ST_Y(ST_Centroid(geom))) AS centroid_latitude
    FROM nearest_features
    WHERE geom IS NOT NULL
  ) centroid
),
list_pairs AS (
  SELECT list_rows.list_row_id, ${labelSql} AS nearest_label,
    ST_Distance(
      ST_Transform(list_rows.geom, 'EPSG:4326', list_crs.meters_crs, always_xy := true),
      ST_Transform(nearest_features.geom, 'EPSG:4326', list_crs.meters_crs, always_xy := true)
    ) AS pair_distance
  FROM list_rows, nearest_features, list_crs
  WHERE nearest_features.geom IS NOT NULL
),
list_measured AS (
  SELECT list_row_id, min(pair_distance) AS distance_meters,
    arg_min(nearest_label, pair_distance) AS nearest_label
  FROM list_pairs
  GROUP BY list_row_id
)`;
}

function _buildFinalSelect(hasNearest: boolean): string {
  const columns = MAP_LAYER_FEATURE_LIST_SQL_COLUMNS;
  const distanceSql = hasNearest
    ? "list_measured.distance_meters"
    : "CAST(NULL AS DOUBLE)";
  const labelSql = hasNearest
    ? "list_measured.nearest_label"
    : "CAST(NULL AS VARCHAR)";
  const joinSql = hasNearest
    ? "\nLEFT JOIN list_measured USING (list_row_id)"
    : "";
  return `SELECT list_rows.properties AS ${quoteSqlIdentifier(columns.properties)},
  ST_X(ST_Centroid(list_rows.geom)) AS ${quoteSqlIdentifier(columns.longitude)},
  ST_Y(ST_Centroid(list_rows.geom)) AS ${quoteSqlIdentifier(columns.latitude)},
  ${distanceSql} AS ${quoteSqlIdentifier(columns.distanceMeters)},
  ${labelSql} AS ${quoteSqlIdentifier(columns.nearestLabel)}
FROM list_rows${joinSql}
ORDER BY list_rows.list_row_id`;
}

/**
 * SQL listing one layer's features: each feature's properties and centroid
 * and, when `nearest` is given, its distance in meters to the nearest of
 * those features and that feature's label. Distance is measured in the same
 * derived meters CRS a buffer uses, so a listed feature inside a buffer is
 * never measured farther than the buffer's distance. Use it to build a
 * feature list, for example "schools near exposure sites".
 */
export function compileMapLayerFeatureListSql(
  options: Readonly<{
    layerSource: MapLayerFeatureSource;
    nearest: MapLayerFeatureListNearestSource | undefined;
  }>,
): string {
  const nearestCtes = options.nearest
    ? `,\n${_buildNearestCtes(options.nearest)}`
    : "";
  return `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "list_features", source: options.layerSource })},
${_buildListRowsCte()}${nearestCtes}
${_buildFinalSelect(options.nearest !== undefined)}`;
}
