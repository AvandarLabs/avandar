/**
 * Latitude/longitude overlay SQL compilation for time and AOI filters.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { compileLatLngOverlaySql } from "./compileLatLngOverlaySql";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

const january: AvaMapConfig.TimeRange = {
  start: "2026-01-01T00:00:00.000Z",
  end: "2026-01-31T23:59:59.000Z",
};

const sampleAoi: AvaMapConfig.AoiPolygon = {
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
};

const latLngLayerWithTime: MapLayer.T = {
  ...MapLayer.makeEmpty("Cases"),
  timeColumn: uuid<QueryColumn.Id>(),
  geoBinding: {
    type: "latLngColumns",
    latitude: uuid<QueryColumn.Id>(),
    longitude: uuid<QueryColumn.Id>(),
  },
};

describe("compileLatLngOverlaySql", () => {
  it("returns the source sql rather than undefined with no aoi or time range", () => {
    const sql = compileLatLngOverlaySql({
      sourceSql: "SELECT * FROM cases",
      layer: latLngLayerWithTime,
      overlay: { aoi: undefined, timeRange: undefined },
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      timeColumnName: "observed_at",
    });
    expect(sql).toBe("SELECT * FROM cases");
  });

  it("compiles lat/lng time-only sql without spatial functions", () => {
    const sql = compileLatLngOverlaySql({
      sourceSql: "SELECT * FROM cases",
      layer: latLngLayerWithTime,
      overlay: { aoi: undefined, timeRange: january },
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      timeColumnName: "observed_at",
    });
    expect(sql).toContain("BETWEEN");
    expect(sql).not.toContain("ST_");
  });

  it("compiles lat/lng aoi sql with a point intersect", () => {
    const sql = compileLatLngOverlaySql({
      sourceSql: "SELECT * FROM cases",
      layer: latLngLayerWithTime,
      overlay: { aoi: sampleAoi, timeRange: undefined },
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      timeColumnName: "observed_at",
    });
    expect(sql).toContain("ST_Point");
    expect(sql).toContain("ST_Intersects");
    expect(sql).toContain("ST_GeomFromGeoJSON");
    expect(sql).not.toContain("BETWEEN");
  });

  it("keeps the time wrap inside lat/lng aoi sql", () => {
    const sql = compileLatLngOverlaySql({
      sourceSql: "SELECT * FROM cases",
      layer: latLngLayerWithTime,
      overlay: { aoi: sampleAoi, timeRange: january },
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      timeColumnName: "observed_at",
    });
    expect(sql).toContain("ST_Point");
    expect(sql).toContain("ST_Intersects");
    expect(sql).toContain("BETWEEN");
  });

  it("omits spatial functions when applyAoiFilter is false", () => {
    const sql = compileLatLngOverlaySql({
      sourceSql: "SELECT * FROM cases",
      layer: { ...latLngLayerWithTime, applyAoiFilter: false },
      overlay: { aoi: sampleAoi, timeRange: january },
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      timeColumnName: "observed_at",
    });
    expect(sql).toContain("BETWEEN");
    expect(sql).not.toContain("ST_");
  });
});
