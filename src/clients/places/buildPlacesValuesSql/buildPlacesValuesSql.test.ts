import { describe, expect, it } from "vitest";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import type { PlaceRow } from "@/clients/places/places.types";

const ROW: PlaceRow = {
  placeId: "p1",
  name: "O'Brien's Café 🍕",
  address: undefined,
  latitude: 40.7603,
  longitude: -73.9885,
  startsAt: "2026-10-02T18:00",
  endsAt: undefined,
  notes: undefined,
};

describe("buildPlacesValuesSql", () => {
  it("writes one typed tuple per place in the places column order", () => {
    expect(buildPlacesValuesSql([ROW])).toBe(
      "SELECT * FROM (VALUES\n" +
        "  ('p1', 'O''Brien''s Café 🍕', CAST(NULL AS VARCHAR), CAST(40.7603 AS DOUBLE), CAST(-73.9885 AS DOUBLE), CAST('2026-10-02T18:00' AS TIMESTAMP), CAST(NULL AS TIMESTAMP), CAST(NULL AS VARCHAR))\n" +
        ") AS places(place_id, name, address, latitude, longitude, starts_at, ends_at, notes)",
    );
  });

  it("doubles a quote that would otherwise end the literal early", () => {
    const sql = buildPlacesValuesSql([
      { ...ROW, notes: "x'); DROP TABLE places; --" },
    ]);
    expect(sql).toContain("'x''); DROP TABLE places; --'");
  });

  it("writes an empty places dataset as a typed query with no rows", () => {
    expect(buildPlacesValuesSql([])).toBe(
      "SELECT CAST(NULL AS VARCHAR) AS place_id, CAST(NULL AS VARCHAR) AS name, CAST(NULL AS VARCHAR) AS address, CAST(NULL AS DOUBLE) AS latitude, CAST(NULL AS DOUBLE) AS longitude, CAST(NULL AS TIMESTAMP) AS starts_at, CAST(NULL AS TIMESTAMP) AS ends_at, CAST(NULL AS VARCHAR) AS notes WHERE false",
    );
  });

  it("refuses a coordinate that is not a finite number", () => {
    expect(() => {
      return buildPlacesValuesSql([{ ...ROW, latitude: Number.NaN }]);
    }).toThrow("A place coordinate must be a finite number.");
  });

  it("refuses more than 500 places", () => {
    const rows = Array.from({ length: 501 }, (_unused, index) => {
      return { ...ROW, placeId: `p${index}` };
    });
    expect(() => {
      return buildPlacesValuesSql(rows);
    }).toThrow("A places dataset holds at most 500 places.");
  });
});
