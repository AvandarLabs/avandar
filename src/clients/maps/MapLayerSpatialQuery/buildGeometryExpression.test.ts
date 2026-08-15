import { describe, expect, it } from "vitest";
import { buildGeometryExpression } from "./buildGeometryExpression";

describe("buildGeometryExpression", () => {
  it("parses WKT without allowing a failed value to abort the query", () => {
    expect(buildGeometryExpression('"shape"', "wkt")).toBe(
      'TRY(ST_GeomFromText(CAST("shape" AS VARCHAR)))',
    );
  });

  it("parses GeoJSON through a varchar representation", () => {
    expect(buildGeometryExpression('"shape"', "geojson")).toBe(
      'TRY(ST_GeomFromGeoJSON(CAST("shape" AS VARCHAR)))',
    );
  });

  it("accepts binary and hexadecimal WKB, including an optional prefix", () => {
    const expression = buildGeometryExpression('"shape"', "wkb");

    expect(expression).toContain("typeof(\"shape\") = 'BLOB'");
    expect(expression).toContain('TRY(ST_GeomFromWKB(CAST("shape" AS BLOB)))');
    expect(expression).toContain(
      "regexp_replace(CAST(\"shape\" AS VARCHAR), '^0[xX]', '')",
    );
    expect(expression).toContain("TRY(ST_GeomFromHEXWKB(");
  });
});
