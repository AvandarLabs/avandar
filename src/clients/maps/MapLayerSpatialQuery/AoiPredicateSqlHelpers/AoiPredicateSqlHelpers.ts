import { quoteSqlLiteral } from "@avandar/utils/sql";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * DuckDB geometry for a map AOI polygon, quoted as a GeoJSON literal.
 */
export function makeAoiGeometrySql(aoi: AvaMapConfig.AoiPolygon): string {
  return `ST_GeomFromGeoJSON(${quoteSqlLiteral(JSON.stringify(aoi))})`;
}

/**
 * Source-row ST_Intersects predicate against the map AOI.
 */
export function makeSourceAoiPredicateSql(
  geometrySql: string,
  aoi: AvaMapConfig.AoiPolygon,
): string {
  return `ST_Intersects(${geometrySql}, ${makeAoiGeometrySql(aoi)})`;
}

/**
 * Output-feature ST_Intersects predicate against the map AOI.
 */
export function makeOutputAoiPredicateSql(
  geometrySql: string,
  aoi: AvaMapConfig.AoiPolygon,
): string {
  return `ST_Intersects(${geometrySql}, ${makeAoiGeometrySql(aoi)})`;
}
