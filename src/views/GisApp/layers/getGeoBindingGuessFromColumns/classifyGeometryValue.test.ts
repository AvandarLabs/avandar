import { describe, expect, it } from "vitest";
import { classifyGeometryValue } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/classifyGeometryValue";

const POINT_WKB_HEX = "0101000000000000000000E03F000000000000E03F";

describe("classifyGeometryValue", () => {
  it("reads a Socrata point as WKT", () => {
    expect(classifyGeometryValue("POINT (-73.98 40.75)")).toEqual({
      encoding: "wkt",
      family: "point",
      sourceCrs: undefined,
    });
  });

  it("reads a multipoint as a point", () => {
    expect(classifyGeometryValue("MULTIPOINT ((0 0), (1 1))")).toEqual({
      encoding: "wkt",
      family: "point",
      sourceCrs: undefined,
    });
  });

  it("reads a linestring as a line and a multipolygon as a polygon", () => {
    expect(classifyGeometryValue("LINESTRING (0 0, 1 1)")?.family).toBe("line");
    expect(
      classifyGeometryValue("MULTIPOLYGON (((0 0, 1 0, 1 1, 0 0)))")?.family,
    ).toBe("polygon");
  });

  it("keeps an explicit non-WGS84 SRID and drops 4326", () => {
    expect(classifyGeometryValue("SRID=3857;POINT (1 2)")?.sourceCrs).toBe(
      3857,
    );
    expect(
      classifyGeometryValue("SRID=4326;POINT (1 2)")?.sourceCrs,
    ).toBeUndefined();
  });

  it("reads GeoJSON text, a feature, and an already-parsed object", () => {
    expect(
      classifyGeometryValue('{"type":"Point","coordinates":[-73.98,40.75]}'),
    ).toEqual({
      encoding: "geojson",
      family: "point",
      sourceCrs: undefined,
    });
    expect(
      classifyGeometryValue({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
        properties: {},
      })?.family,
    ).toBe("polygon");
  });

  it("reads bare and prefixed hexadecimal WKB as a point", () => {
    expect(classifyGeometryValue(POINT_WKB_HEX)).toEqual({
      encoding: "wkb",
      family: "point",
      sourceCrs: undefined,
    });
    expect(classifyGeometryValue(`0x${POINT_WKB_HEX}`)?.encoding).toBe("wkb");
  });

  it("reads binary WKB", () => {
    const bytes = Uint8Array.from(
      POINT_WKB_HEX.match(/../g)!.map((pair) => {
        return Number.parseInt(pair, 16);
      }),
    );
    expect(classifyGeometryValue(bytes)).toEqual({
      encoding: "wkb",
      family: "point",
      sourceCrs: undefined,
    });
  });

  it("rejects addresses, prose that mentions a point, and empty values", () => {
    expect(classifyGeometryValue("123 Main Street, New York")).toBeUndefined();
    expect(classifyGeometryValue("POINT of contact")).toBeUndefined();
    expect(classifyGeometryValue("")).toBeUndefined();
    expect(classifyGeometryValue(null)).toBeUndefined();
  });
});
