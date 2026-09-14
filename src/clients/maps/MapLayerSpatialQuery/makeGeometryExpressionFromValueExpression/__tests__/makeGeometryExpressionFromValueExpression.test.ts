import { describe, expect, it } from "vitest";
import { makeGeometryExpressionFromValueExpression } from "../makeGeometryExpressionFromValueExpression";

describe("makeGeometryExpressionFromValueExpression", () => {
  it("parses WKT without allowing a failed value to abort the query", () => {
    expect(
      makeGeometryExpressionFromValueExpression({
        valueExpression: '"shape"',
        encoding: "wkt",
      }),
    ).toBe('TRY(ST_GeomFromText(CAST("shape" AS VARCHAR)))');
  });

  it("parses GeoJSON through a varchar representation", () => {
    expect(
      makeGeometryExpressionFromValueExpression({
        valueExpression: '"shape"',
        encoding: "geojson",
      }),
    ).toBe('TRY(ST_GeomFromGeoJSON(CAST("shape" AS VARCHAR)))');
  });

  it("accepts binary and hexadecimal WKB, including an optional prefix", () => {
    const expression = makeGeometryExpressionFromValueExpression({
      valueExpression: '"shape"',
      encoding: "wkb",
    });

    expect(expression).toContain("typeof(\"shape\") = 'BLOB'");
    expect(expression).toContain('TRY(ST_GeomFromWKB(CAST("shape" AS BLOB)))');
    expect(expression).toContain(
      "regexp_replace(CAST(\"shape\" AS VARCHAR), '^0[xX]', '')",
    );
    expect(expression).toContain("TRY(ST_GeomFromHEXWKB(");
  });
});
