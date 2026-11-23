/**
 * Row-level tests for the feature-source SQL helpers, run against a real
 * in-memory DuckDB with the spatial extension. Executing is the point: the
 * helpers nest one compiled query inside another, and only real rows show
 * that the features read back, the filter keeps the right ones, and the
 * envelope keeps its diagnostics.
 */
import { describe, expect, it } from "vitest";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeJsonPointerFromPropertyName,
  makeSpatialFilteredEnvelopeSql,
} from "./FeatureSourceSqlHelpers";

/** A one-row envelope literal shaped like a compiled layer query's output. */
function _makeEnvelopeSql(features: readonly GeoJSON.Feature[]): string {
  const collection = JSON.stringify({ type: "FeatureCollection", features });
  return `SELECT json('${collection}') AS "__avandar_feature_collection",
    json_object('sourceCount', ${features.length}) AS "__avandar_diagnostics"`;
}

const _POINTS_ENVELOPE_SQL = _makeEnvelopeSql([
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.5, 0.5] },
    properties: { name: "inside" },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [5, 5] },
    properties: { name: "outside" },
  },
]);

const _SQUARE_ENVELOPE_SQL = _makeEnvelopeSql([
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: {},
  },
]);

/** Parses a DuckDB JSON cell, which the Node client returns as text. */
function _parseJsonCell(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

async function _runFilteredEnvelope(): Promise<Record<string, unknown>> {
  return withDuckDb(async (connection) => {
    await connection.run("INSTALL spatial; LOAD spatial;");
    const result = await connection.runAndReadAll(
      makeSpatialFilteredEnvelopeSql({
        envelopeSql: _POINTS_ENVELOPE_SQL,
        filterEnvelopeSql: _SQUARE_ENVELOPE_SQL,
      }),
    );
    return result.getRowObjects()[0] ?? {};
  });
}

describe("FeatureSourceSqlHelpers executed", () => {
  it("keeps only the features inside the filter polygons", async () => {
    const row = await _runFilteredEnvelope();
    const collection = _parseJsonCell(
      row.__avandar_feature_collection,
    ) as GeoJSON.FeatureCollection;

    expect(
      collection.features.map((feature) => {
        return feature.properties?.name;
      }),
    ).toEqual(["inside"]);
  });

  it("keeps the filtered layer's diagnostics", async () => {
    const row = await _runFilteredEnvelope();

    expect(_parseJsonCell(row.__avandar_diagnostics)).toEqual({
      sourceCount: 2,
    });
  });

  it("reads latitude and longitude rows as points carrying their columns", async () => {
    const rows = await withDuckDb(async (connection) => {
      await connection.run("INSTALL spatial; LOAD spatial;");
      await connection.run(
        `CREATE TABLE sites AS SELECT * FROM (VALUES
          ('Union Square', '40.7359', '-73.9906')
        ) AS t(site_name, latitude, longitude)`,
      );
      const cteSql = makeFeaturesCteSqlFromFeatureSource({
        cteName: "site_features",
        source: {
          type: "rows",
          sql: "SELECT * FROM sites",
          latitudeColumnName: "latitude",
          longitudeColumnName: "longitude",
        },
      });
      const result = await connection.runAndReadAll(
        `WITH ${cteSql}
        SELECT json_extract_string(properties, '/site_name') AS site_name,
          ST_X(geom) AS longitude, ST_Y(geom) AS latitude
        FROM site_features`,
      );
      return result.getRowObjects();
    });

    expect(rows).toEqual([
      { site_name: "Union Square", longitude: -73.9906, latitude: 40.7359 },
    ]);
  });

  it("reads a property whose name holds a slash and a tilde", async () => {
    const value = await withDuckDb(async (connection) => {
      const result = await connection.runAndReadAll(
        `SELECT json_extract_string('{"a/b~c":"found"}', '${makeJsonPointerFromPropertyName("a/b~c")}') AS value`,
      );
      return result.getRowObjects()[0]?.value;
    });

    expect(value).toBe("found");
  });
});
