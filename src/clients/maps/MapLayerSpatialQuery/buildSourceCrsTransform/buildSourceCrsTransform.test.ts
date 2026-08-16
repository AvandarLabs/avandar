import { describe, expect, it } from "vitest";
import { buildSourceCrsTransform } from "./buildSourceCrsTransform";

describe("buildSourceCrsTransform", () => {
  it("leaves geometry unchanged when the source CRS is unset", () => {
    expect(buildSourceCrsTransform("parsed_geometry", undefined)).toBe(
      "parsed_geometry",
    );
  });

  it("wraps geometry in a failure-tolerant transform to WGS 84", () => {
    expect(buildSourceCrsTransform("parsed_geometry", 32_633)).toBe(
      "TRY(ST_Transform(parsed_geometry, 'EPSG:32633', 'EPSG:4326', always_xy := true))",
    );
  });
});
