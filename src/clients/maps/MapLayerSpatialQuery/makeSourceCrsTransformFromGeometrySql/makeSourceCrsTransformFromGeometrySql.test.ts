import { describe, expect, it } from "vitest";
import { makeSourceCrsTransformFromGeometrySql } from "./makeSourceCrsTransformFromGeometrySql";

describe("makeSourceCrsTransformFromGeometrySql", () => {
  it("leaves geometry unchanged when the source CRS is unset", () => {
    expect(
      makeSourceCrsTransformFromGeometrySql({
        geometrySql: "parsed_geometry",
        sourceCrs: undefined,
      }),
    ).toBe("parsed_geometry");
  });

  it("wraps geometry in a failure-tolerant transform to WGS 84", () => {
    expect(
      makeSourceCrsTransformFromGeometrySql({
        geometrySql: "parsed_geometry",
        sourceCrs: 32_633,
      }),
    ).toBe(
      "TRY(ST_Transform(parsed_geometry, 'EPSG:32633', 'EPSG:4326', always_xy := true))",
    );
  });
});
