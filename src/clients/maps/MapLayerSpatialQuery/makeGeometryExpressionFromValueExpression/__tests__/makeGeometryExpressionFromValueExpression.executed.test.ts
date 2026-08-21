/**
 * Row-level tests for {@link makeGeometryExpressionFromValueExpression}. Each
 * case runs the emitted expression against a real in-memory DuckDB with the
 * spatial extension and asserts the geometry that comes back.
 *
 * Executing rather than snapshotting is the point. The sibling
 * `makeGeometryExpressionFromValueExpression.test.ts` pins the expression's
 * *text*, which stays green when the SQL is subtly wrong: a wrong parser
 * function, a cast that silently yields NULL, or a `TRY` that swallows a whole
 * column would all still match the string. Only real rows show that WKT,
 * GeoJSON and both spellings of WKB decode to the geometry the map draws.
 *
 * The only other coverage of that is `tests/e2e/gis-geometry-column.spec.ts`,
 * which needs a browser, a signed-in user and an imported dataset to assert
 * the same facts in ~40s.
 *
 * The fixture values mirror `tests/data/gis/geometry-formats.csv` so the two
 * lanes describe the same data, including its deliberately unparseable row.
 */
import { isString } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { makeGeometryExpressionFromValueExpression } from "../makeGeometryExpressionFromValueExpression";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const _POINT_WKB_HEX = "0101000000000000000000E03F000000000000E03F";
const _LINESTRING_WKB_HEX =
  "01020000000200000000000000000000000000000000000000000000000000F03F0000" +
  "00000000F03F";
const _POLYGON_WKB_HEX =
  "010300000001000000050000000000000000000000000000000000000000000000000" +
  "0F03F0000000000000000000000000000F03F000000000000F03F0000000000000000" +
  "000000000000F03F00000000000000000000000000000000";

/**
 * One row per geometry family plus a fourth whose every representation is
 * junk, which is what proves `TRY` degrades that row rather than the query.
 */
const _FIXTURE_SQL = `
  CREATE TABLE shapes AS SELECT * FROM (VALUES
    (
      'POINT (0.5 0.5)',
      '{"type":"Point","coordinates":[0.5,0.5]}',
      '${_POINT_WKB_HEX}',
      '0x${_POINT_WKB_HEX}',
      unhex('${_POINT_WKB_HEX}')
    ),
    (
      'LINESTRING (0 0, 1 1)',
      '{"type":"LineString","coordinates":[[0,0],[1,1]]}',
      '${_LINESTRING_WKB_HEX}',
      '0x${_LINESTRING_WKB_HEX}',
      unhex('${_LINESTRING_WKB_HEX}')
    ),
    (
      'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))',
      '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
      '${_POLYGON_WKB_HEX}',
      '0x${_POLYGON_WKB_HEX}',
      unhex('${_POLYGON_WKB_HEX}')
    ),
    ('NOT GEOMETRY', 'not json', 'not-wkb', '0xnot-wkb', unhex('00'))
  ) AS t(wkt, geojson, wkb_hex, wkb_prefixed, wkb_blob);
`;

/**
 * The WKT of every row of `column` once decoded under `encoding`, with an
 * `undefined` for each row the expression could not parse.
 */
async function _getWktRowsFromColumn(
  options: Readonly<{
    column: string;
    encoding: MapLayer.GeometryEncoding;
  }>,
): Promise<Array<string | undefined>> {
  const expression = makeGeometryExpressionFromValueExpression({
    valueExpression: `"${options.column}"`,
    encoding: options.encoding,
  });
  return withDuckDb(async (connection) => {
    // The spatial extension is loaded per connection rather than by the shared
    // harness: every other executed suite is pure SQL and should not pay for
    // an extension install it never calls.
    await connection.run("INSTALL spatial; LOAD spatial;");
    await connection.run(_FIXTURE_SQL);
    const result = await connection.runAndReadAll(
      `SELECT ST_AsText(${expression}) AS shape FROM shapes`,
    );
    return result.getRowObjects().map((row) => {
      return isString(row.shape) ? row.shape : undefined;
    });
  });
}

describe("makeGeometryExpressionFromValueExpression executed", () => {
  it("decodes WKT into each geometry family", async () => {
    // The trailing `undefined` is the regression guard for `TRY`: without it
    // DuckDB aborts the statement on the unparseable row and the layer renders
    // nothing at all, rather than rendering the three rows it can and
    // reporting the fourth as unmapped.
    await expect(
      _getWktRowsFromColumn({ column: "wkt", encoding: "wkt" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      undefined,
    ]);
  });

  it("decodes GeoJSON into each geometry family", async () => {
    await expect(
      _getWktRowsFromColumn({ column: "geojson", encoding: "geojson" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      undefined,
    ]);
  });

  it("decodes bare hexadecimal WKB", async () => {
    await expect(
      _getWktRowsFromColumn({ column: "wkb_hex", encoding: "wkb" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      undefined,
    ]);
  });

  it("decodes hexadecimal WKB that carries an 0x prefix", async () => {
    // The prefix is stripped by a regex rather than by the parser, so this is
    // the case a text-only assertion cannot tell apart from the bare one.
    await expect(
      _getWktRowsFromColumn({ column: "wkb_prefixed", encoding: "wkb" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      undefined,
    ]);
  });

  it("decodes binary WKB, which takes the other arm of the encoding", async () => {
    // The `wkb` expression branches on `typeof(...) = 'BLOB'` at runtime: a
    // binary column goes to `ST_GeomFromWKB` while the two hexadecimal columns
    // above take the `ST_GeomFromHEXWKB` arm. Only a real BLOB column reaches
    // the first arm, so without this case half the expression never runs, and
    // the sibling text test can only pin the string that contains both arms.
    await expect(
      _getWktRowsFromColumn({ column: "wkb_blob", encoding: "wkb" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      undefined,
    ]);
  });
});
