import { quoteSqlLiteral } from "@avandar/utils/sql";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Returns a DuckDB geometry expression for an AOI polygon.
 * Use it, for example, when building an AOI intersection predicate.
 */
export function makeAoiGeometrySql(aoi: AvaMapConfig.AoiPolygon): string {
  return `ST_GeomFromGeoJSON(${quoteSqlLiteral(JSON.stringify(aoi))})`;
}

/**
 * Returns an ST_Intersects predicate for source geometry and an AOI polygon.
 * Use it, for example, to filter source rows within a map query.
 */
export function makeSourceAoiPredicateSql(
  geometrySql: string,
  aoi: AvaMapConfig.AoiPolygon,
): string {
  return `ST_Intersects(${geometrySql}, ${makeAoiGeometrySql(aoi)})`;
}

/**
 * Returns an ST_Intersects predicate for output geometry and an AOI polygon.
 * Use it, for example, to filter generated map features by the AOI.
 */
export function makeOutputAoiPredicateSql(
  geometrySql: string,
  aoi: AvaMapConfig.AoiPolygon,
): string {
  return `ST_Intersects(${geometrySql}, ${makeAoiGeometrySql(aoi)})`;
}
