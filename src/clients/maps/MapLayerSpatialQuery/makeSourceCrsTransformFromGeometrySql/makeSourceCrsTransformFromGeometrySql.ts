import { quoteSqlLiteral } from "@avandar/utils/sql";

/** Reprojects parsed source geometry to WGS 84 when an EPSG code is set. */
export function makeSourceCrsTransformFromGeometrySql(options: {
  geometrySql: string;
  sourceCrs: number | undefined;
}): string {
  if (options.sourceCrs === undefined) {
    return options.geometrySql;
  }
  return `TRY(ST_Transform(${options.geometrySql}, ${quoteSqlLiteral(`EPSG:${options.sourceCrs}`)}, 'EPSG:4326', always_xy := true))`;
}
