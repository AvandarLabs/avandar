import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { MapLayerSpatialQueryColumns } from "../MapLayerSpatialQuery.constants";

/**
 * Where a layer's features come from when another query reads them: a
 * compiled one-row feature envelope, or the filtered rows of a latitude and
 * longitude layer. For example, a buffer reads its source this way, and so
 * does a feature list.
 */
export type MapLayerFeatureSource =
  | { type: "envelope"; sql: string }
  | {
      type: "rows";
      sql: string;
      latitudeColumnName: string;
      longitudeColumnName: string;
    };

/**
 * A JSON pointer (`/name`) that reads one property by its exact name, with
 * `~` and `/` escaped. Use it with `json_extract_string` for column names
 * that a JSONPath would misread, such as a name holding a dot or a quote.
 */
export function makeJsonPointerFromPropertyName(propertyName: string): string {
  return `/${propertyName.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

/**
 * CTE text that reads a feature source into `cteName`, one row per feature
 * with a JSON `properties` column and a WGS 84 `geom` column. A rows source
 * keeps every column of each row in `properties`.
 */
export function makeFeaturesCteSqlFromFeatureSource(
  options: Readonly<{ cteName: string; source: MapLayerFeatureSource }>,
): string {
  const { cteName, source } = options;
  if (source.type === "rows") {
    const longitude = quoteSqlIdentifier(source.longitudeColumnName);
    const latitude = quoteSqlIdentifier(source.latitudeColumnName);
    return `${cteName}_rows AS (
  ${source.sql}
),
${cteName} AS (
  SELECT to_json(${cteName}_rows) AS properties,
    TRY(ST_Point(TRY_CAST(${longitude} AS DOUBLE), TRY_CAST(${latitude} AS DOUBLE))) AS geom
  FROM ${cteName}_rows
)`;
  }
  const featureCollection = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  return `${cteName}_envelope AS (
  ${source.sql}
),
${cteName} AS (
  SELECT json_extract(feature.value, '$.properties') AS properties,
    ST_GeomFromGeoJSON(json_extract_string(feature.value, '$.geometry')) AS geom
  FROM ${cteName}_envelope,
    json_each(json_extract(${cteName}_envelope.${featureCollection}, '$.features')) AS feature
)`;
}

/**
 * True for a geometry that intersects any polygon in a `filter_geoms` CTE
 * built by {@link makeFeaturesCteSqlFromFeatureSource}. Use it as the WHERE
 * predicate of a spatially filtered query.
 */
export function makeSpatialFilterPredicateSql(geometrySql: string): string {
  return `EXISTS (SELECT 1 FROM filter_geoms WHERE filter_geoms.geom IS NOT NULL AND ST_Intersects(${geometrySql}, filter_geoms.geom))`;
}

/**
 * Wraps a compiled one-row envelope so it keeps only the features that
 * intersect the filtering layer's features, with its diagnostics unchanged.
 * Use it to apply a layer's spatial filter to any spatial compiler's output.
 */
export function makeSpatialFilteredEnvelopeSql(
  options: Readonly<{ envelopeSql: string; filterEnvelopeSql: string }>,
): string {
  const featureCollection = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnostics = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  return `WITH layer_envelope AS (
  ${options.envelopeSql}
),
${makeFeaturesCteSqlFromFeatureSource({ cteName: "filter_geoms", source: { type: "envelope", sql: options.filterEnvelopeSql } })},
kept_features AS (
  SELECT feature.value AS feature
  FROM layer_envelope,
    json_each(json_extract(layer_envelope.${featureCollection}, '$.features')) AS feature
  WHERE ${makeSpatialFilterPredicateSql("ST_GeomFromGeoJSON(json_extract_string(feature.value, '$.geometry'))")}
)
SELECT json_object('type', 'FeatureCollection',
  'features', coalesce((SELECT json_group_array(feature) FROM kept_features), json('[]')))
  AS ${featureCollection},
  layer_envelope.${diagnostics} AS ${diagnostics}
FROM layer_envelope`;
}
