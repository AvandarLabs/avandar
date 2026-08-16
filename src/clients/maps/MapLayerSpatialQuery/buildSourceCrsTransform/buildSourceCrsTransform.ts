import { quoteSqlLiteral } from "@avandar/utils/sql";

/** Reprojects parsed source geometry to WGS 84 when an EPSG code is set. */
export function buildSourceCrsTransform(
  geometrySql: string,
  sourceCrs: number | undefined,
): string {
  if (sourceCrs === undefined) {
    return geometrySql;
  }
  return `TRY(ST_Transform(${geometrySql}, ${quoteSqlLiteral(`EPSG:${sourceCrs}`)}, 'EPSG:4326', always_xy := true))`;
}
