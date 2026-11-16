import { describe, expect, it } from "vitest";
import { getGeometryBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeometryBindingGuessFromColumns";

const POINT = "POINT (-73.98 40.75)";
const OTHER_POINT = "POINT (-73.99 40.76)";

describe("getGeometryBindingGuessFromColumns", () => {
  it("binds a location column whose values are point WKT", () => {
    expect(
      getGeometryBindingGuessFromColumns([
        { name: "school_name", sampleValues: ["P.S. 15"] },
        { name: "location", sampleValues: [POINT, OTHER_POINT, null] },
      ]),
    ).toEqual({
      columnName: "location",
      encoding: "wkt",
      family: "point",
      sourceCrs: undefined,
    });
  });

  it("binds a polygon GeoJSON column and a WKB point column", () => {
    expect(
      getGeometryBindingGuessFromColumns([
        {
          name: "the_geom",
          sampleValues: [
            '{"type":"MultiPolygon","coordinates":[[[[0,0],[1,0],[1,1],[0,0]]]]}',
          ],
        },
      ]),
    ).toMatchObject({ encoding: "geojson", family: "polygon" });
    expect(
      getGeometryBindingGuessFromColumns([
        {
          name: "wkb_hex",
          sampleValues: ["0101000000000000000000E03F000000000000E03F"],
        },
      ]),
    ).toMatchObject({
      columnName: "wkb_hex",
      encoding: "wkb",
      family: "point",
    });
  });

  it("binds a column that is not named like geometry when every value is", () => {
    expect(
      getGeometryBindingGuessFromColumns([
        { name: "school_site", sampleValues: [POINT, OTHER_POINT] },
      ])?.columnName,
    ).toBe("school_site");
  });

  it("rejects a location column of addresses", () => {
    expect(
      getGeometryBindingGuessFromColumns([
        { name: "location", sampleValues: ["123 Main Street", "456 Oak Ave"] },
      ]),
    ).toBeUndefined();
  });

  it("rejects a column whose geometries do not share a family", () => {
    expect(
      getGeometryBindingGuessFromColumns([
        {
          name: "wkt",
          sampleValues: [POINT, "LINESTRING (0 0, 1 1)", "NOT GEOMETRY"],
        },
      ]),
    ).toBeUndefined();
  });

  it("accepts one unrecognized value among five points and rejects one among four", () => {
    const points = [POINT, OTHER_POINT, POINT, OTHER_POINT];
    expect(
      getGeometryBindingGuessFromColumns([
        { name: "location", sampleValues: [...points, "n/a"] },
      ])?.columnName,
    ).toBe("location");
    expect(
      getGeometryBindingGuessFromColumns([
        { name: "location", sampleValues: [...points.slice(0, 3), "n/a"] },
      ]),
    ).toBeUndefined();
  });

  it("prefers the_geom over location when both columns are geometry", () => {
    expect(
      getGeometryBindingGuessFromColumns([
        { name: "location", sampleValues: [POINT, OTHER_POINT] },
        {
          name: "the_geom",
          sampleValues: ["POLYGON ((0 0, 1 0, 1 1, 0 0))"],
        },
      ])?.columnName,
    ).toBe("the_geom");
  });
});
