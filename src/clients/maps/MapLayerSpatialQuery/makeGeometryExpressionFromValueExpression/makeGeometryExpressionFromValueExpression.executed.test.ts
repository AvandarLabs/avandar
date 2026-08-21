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
 * Until this suite existed the only coverage of that was
 * `tests/e2e/gis-geometry-column.spec.ts`, which needs a browser, a signed-in
 * user and an imported dataset to assert the same facts in ~40s.
 *
 * The fixture values mirror `tests/data/gis/geometry-formats.csv` so the two
 * lanes describe the same data, including its deliberately unparseable row.
 */
import { describe, expect, it } from "vitest";
import { makeGeometryExpressionFromValueExpression } from "@/clients/maps/MapLayerSpatialQuery/makeGeometryExpressionFromValueExpression/makeGeometryExpressionFromValueExpression";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { DuckDBConnection } from "@duckdb/node-api";

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
      '0x${_POINT_WKB_HEX}'
    ),
    (
      'LINESTRING (0 0, 1 1)',
      '{"type":"LineString","coordinates":[[0,0],[1,1]]}',
      '${_LINESTRING_WKB_HEX}',
      '0x${_LINESTRING_WKB_HEX}'
    ),
    (
      'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))',
      '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
      '${_POLYGON_WKB_HEX}',
      '0x${_POLYGON_WKB_HEX}'
    ),
    ('NOT GEOMETRY', 'not json', 'not-wkb', '0xnot-wkb')
  ) AS t(wkt, geojson, wkb_hex, wkb_prefixed);
`;

/** Decodes `column` under `encoding` and returns each row as WKT or null. */
async function _decode(
  options: Readonly<{
    column: string;
    encoding: MapLayer.GeometryEncoding;
  }>,
): Promise<Array<string | null>> {
  const expression = makeGeometryExpressionFromValueExpression({
    valueExpression: `"${options.column}"`,
    encoding: options.encoding,
  });
  return withDuckDb(async (connection: DuckDBConnection) => {
    // The spatial extension is loaded per connection rather than by the shared
    // harness: every other executed suite is pure SQL and should not pay for
    // an extension install it never calls.
    await connection.run("INSTALL spatial; LOAD spatial;");
    await connection.run(_FIXTURE_SQL);
    const result = await connection.runAndReadAll(
      `SELECT ST_AsText(${expression}) AS shape FROM shapes`,
    );
    return result.getRowObjects().map((row) => {
      return (row.shape ?? null) as string | null;
    });
  });
}

describe("makeGeometryExpressionFromValueExpression executed", () => {
  it("decodes WKT into each geometry family", async () => {
    await expect(
      _decode({ column: "wkt", encoding: "wkt" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      null,
    ]);
  });

  it("decodes GeoJSON into each geometry family", async () => {
    await expect(
      _decode({ column: "geojson", encoding: "geojson" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      null,
    ]);
  });

  it("decodes bare hexadecimal WKB", async () => {
    await expect(
      _decode({ column: "wkb_hex", encoding: "wkb" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      null,
    ]);
  });

  it("decodes hexadecimal WKB that carries an 0x prefix", async () => {
    // The prefix is stripped by a regex rather than by the parser, so this is
    // the case a text-only assertion cannot tell apart from the bare one.
    await expect(
      _decode({ column: "wkb_prefixed", encoding: "wkb" }),
    ).resolves.toEqual([
      "POINT (0.5 0.5)",
      "LINESTRING (0 0, 1 1)",
      "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
      null,
    ]);
  });

  it("returns a row per source row, so one bad value cannot shorten the layer", async () => {
    // The regression guard for `TRY`: without it DuckDB aborts the statement on
    // the unparseable row and the layer renders nothing at all, rather than
    // rendering the three rows it can and reporting the fourth as unmapped.
    const shapes = await _decode({ column: "wkt", encoding: "wkt" });
    expect(shapes).toHaveLength(4);
    expect(shapes.filter((shape) => {
      return shape !== null;
    })).toHaveLength(3);
  });
});
