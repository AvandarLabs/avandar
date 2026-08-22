/**
 * AOI geometry SQL and ST_Intersects predicates.
 */
import { quoteSqlLiteral } from "@avandar/utils/sql";
import { describe, expect, it } from "vitest";
import {
  makeAoiGeometrySql,
  makeOutputAoiPredicateSql,
  makeSourceAoiPredicateSql,
} from "./AoiPredicateSqlHelpers";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

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

describe("makeAoiGeometrySql", () => {
  it("quotes the geojson polygon as a sql literal", () => {
    expect(makeAoiGeometrySql(sampleAoi)).toBe(
      `ST_GeomFromGeoJSON(${quoteSqlLiteral(JSON.stringify(sampleAoi))})`,
    );
  });
});

describe("makeSourceAoiPredicateSql", () => {
  it("intersects the given geometry with the aoi", () => {
    expect(makeSourceAoiPredicateSql("point_geometry", sampleAoi)).toBe(
      `ST_Intersects(point_geometry, ${makeAoiGeometrySql(sampleAoi)})`,
    );
  });
});

describe("makeOutputAoiPredicateSql", () => {
  it("intersects the given output geometry with the aoi", () => {
    expect(makeOutputAoiPredicateSql('"__avandar_geometry"', sampleAoi)).toBe(
      `ST_Intersects("__avandar_geometry", ${makeAoiGeometrySql(sampleAoi)})`,
    );
  });
});
