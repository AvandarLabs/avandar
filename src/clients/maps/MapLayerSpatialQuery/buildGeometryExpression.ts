import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Builds a failure-tolerant DuckDB Spatial geometry parser expression. */
export function buildGeometryExpression(
  valueExpression: string,
  encoding: MapLayer.GeometryEncoding,
): string {
  if (encoding === "wkt") {
    return `TRY(ST_GeomFromText(CAST(${valueExpression} AS VARCHAR)))`;
  }
  if (encoding === "geojson") {
    return `TRY(ST_GeomFromGeoJSON(CAST(${valueExpression} AS VARCHAR)))`;
  }
  const hexValue =
    `regexp_replace(CAST(${valueExpression} AS VARCHAR), ` + `'^0[xX]', '')`;
  return (
    `CASE WHEN typeof(${valueExpression}) = 'BLOB' ` +
    `THEN TRY(ST_GeomFromWKB(CAST(${valueExpression} AS BLOB))) ` +
    `ELSE TRY(ST_GeomFromHEXWKB(${hexValue})) END`
  );
}
