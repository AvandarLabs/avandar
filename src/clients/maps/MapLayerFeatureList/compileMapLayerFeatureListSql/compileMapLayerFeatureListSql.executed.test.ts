/**
 * Row-level tests for {@link compileMapLayerFeatureListSql}, run against a
 * real in-memory DuckDB with the spatial extension, because distance
 * accuracy is a property of the executed SQL, not of its text.
 */
import { describe, expect, it } from "vitest";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import { compileMapLayerFeatureListSql } from "./compileMapLayerFeatureListSql";
import type { MapLayerFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

const _FIXTURE_SQL = `
  CREATE TABLE schools AS SELECT * FROM (VALUES
    ('Clinton', 40.73, -73.99)
  ) AS t(school_name, latitude, longitude);
  CREATE TABLE sites AS SELECT * FROM (VALUES
    ('North', 40.7372461, -73.99),
    ('Far', 41.5, -73.99)
  ) AS t(site_name, latitude, longitude);
`;

function _makeRowsSource(table: string): MapLayerFeatureSource {
  return {
    type: "rows",
    sql: `SELECT * FROM ${table}`,
    latitudeColumnName: "latitude",
    longitudeColumnName: "longitude",
  };
}

async function _runListSql(
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  return withDuckDb(async (connection) => {
    await connection.run("INSTALL spatial; LOAD spatial;");
    await connection.run(_FIXTURE_SQL);
    const result = await connection.runAndReadAll(sql);
    return result.getRowObjects();
  });
}

describe("compileMapLayerFeatureListSql executed", () => {
  it("measures half a mile within one meter", async () => {
    const [row] = await _runListSql(
      compileMapLayerFeatureListSql({
        layerSource: _makeRowsSource("schools"),
        nearest: {
          source: _makeRowsSource("sites"),
          labelPropertyName: "site_name",
        },
      }),
    );

    expect(
      Math.abs(Number(row?.__avandar_distance_meters) - 804.672),
    ).toBeLessThan(1);
  });

  it("names the nearest site", async () => {
    const [row] = await _runListSql(
      compileMapLayerFeatureListSql({
        layerSource: _makeRowsSource("schools"),
        nearest: {
          source: _makeRowsSource("sites"),
          labelPropertyName: "site_name",
        },
      }),
    );

    expect(row?.__avandar_nearest_label).toBe("North");
  });

  it("returns each row's columns and point with no distance when nothing is measured", async () => {
    const [row] = await _runListSql(
      compileMapLayerFeatureListSql({
        layerSource: _makeRowsSource("schools"),
        nearest: undefined,
      }),
    );

    expect(JSON.parse(String(row?.__avandar_properties))).toEqual({
      school_name: "Clinton",
      latitude: 40.73,
      longitude: -73.99,
    });
    expect(row?.__avandar_longitude).toBe(-73.99);
    expect(row?.__avandar_distance_meters).toBeNull();
  });
});
