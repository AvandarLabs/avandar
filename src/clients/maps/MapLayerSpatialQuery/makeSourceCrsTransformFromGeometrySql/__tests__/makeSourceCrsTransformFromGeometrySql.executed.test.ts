/**
 * Row-level tests for {@link makeSourceCrsTransformFromGeometrySql}. Each case
 * runs the emitted SQL against a real in-memory DuckDB with the spatial
 * extension and asserts the coordinates that come back.
 *
 * Executing rather than snapshotting is the point. The sibling
 * `makeSourceCrsTransformFromGeometrySql.test.ts` pins the SQL *text*, which
 * cannot tell a correct reprojection from a plausible wrong one: swapped
 * source and target CRS, a dropped `always_xy`, or a transform that quietly
 * returns the input would all still match the string, and every one of them
 * puts the layer's features somewhere else on the map.
 *
 * The fixture is `tests/data/gis/web-mercator-points.csv`, so this suite and
 * `tests/e2e/gis-geometry-crs.spec.ts` reproject the same coordinates.
 */
import { describe, expect, it } from "vitest";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { makeSourceCrsTransformFromGeometrySql } from "../makeSourceCrsTransformFromGeometrySql";

/** The three Web Mercator points the GIS CRS fixture carries. */
const _FIXTURE_SQL = `
  CREATE TABLE sites AS SELECT * FROM (VALUES
    ('G1', 'POINT (1113194.9079 1118889.9749)'),
    ('G2', 'POINT (1168854.6533 1175452.6086)'),
    ('G3', 'POINT (1224514.3987 1232106.8019)')
  ) AS t(site_id, mercator_wkt);
`;

/** The parsed-geometry expression the layer compiler feeds the transform. */
const _PARSED_GEOMETRY_SQL =
  'TRY(ST_GeomFromText(CAST("mercator_wkt" AS VARCHAR)))';

/** Longitude/latitude pairs the transform yields, rounded to six places. */
async function _getLonLatPairsFromSourceCrs(
  sourceCrs: number | undefined,
): Promise<Array<[number, number]>> {
  const geometrySql = makeSourceCrsTransformFromGeometrySql({
    geometrySql: _PARSED_GEOMETRY_SQL,
    sourceCrs,
  });
  return withDuckDb(async (connection) => {
    await connection.run("INSTALL spatial; LOAD spatial;");
    await connection.run(_FIXTURE_SQL);
    const result = await connection.runAndReadAll(
      `SELECT round(ST_X(${geometrySql}), 6) AS lon,
              round(ST_Y(${geometrySql}), 6) AS lat
       FROM sites ORDER BY site_id`,
    );
    return result.getRowObjects().map((row) => {
      return [Number(row.lon), Number(row.lat)] as [number, number];
    });
  });
}

describe("makeSourceCrsTransformFromGeometrySql executed", () => {
  it("reprojects EPSG:3857 metres to WGS 84 degrees", async () => {
    // Rounded to six places because PROJ returns the round trip a hair off an
    // exact degree (9.99999999970593), which is precision, not disagreement.
    await expect(_getLonLatPairsFromSourceCrs(3857)).resolves.toEqual([
      [10, 10],
      [10.5, 10.5],
      [11, 11],
    ]);
  });

  it("leaves coordinates alone when no source CRS is set", async () => {
    // The regression guard for the `undefined` arm: a layer whose data is
    // already WGS 84 must not be transformed, and a transform applied anyway
    // would move these points into the millions rather than leaving degrees.
    await expect(_getLonLatPairsFromSourceCrs(undefined)).resolves.toEqual([
      [1113194.9079, 1118889.9749],
      [1168854.6533, 1175452.6086],
      [1224514.3987, 1232106.8019],
    ]);
  });
});
