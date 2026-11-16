import { describe, expect, it } from "vitest";
import { buildPlacesReadSql } from "@/clients/places/buildPlacesReadSql";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import { parsePlaceRowsFromQueryRows } from "@/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import { withDuckDb } from "../../../../tests/integration/queries/executedDuckDb";
import type { PlaceRow } from "@/clients/places/places.types";

/**
 * What the place tool writes into `raw_sql` is what it reads back: quotes,
 * unicode, empty optional fields, and an empty dataset all survive DuckDB.
 */

const ROWS: PlaceRow[] = [
  {
    placeId: "p1",
    name: "O'Brien's Café 🍕",
    address: "W 46th St, New York",
    latitude: 40.7603,
    longitude: -73.9885,
    startsAt: "2026-10-02T18:00",
    endsAt: "2026-10-02T22:00",
    notes: "Exposure 10/02 6-10pm",
  },
  {
    placeId: "p2",
    name: 'École "Saint-Jean"',
    address: undefined,
    latitude: -12.5,
    longitude: 179.999,
    startsAt: undefined,
    endsAt: undefined,
    notes: undefined,
  },
];

async function _readBack(rows: readonly PlaceRow[]): Promise<PlaceRow[]> {
  return await withDuckDb(async (connection) => {
    const result = await connection.runAndReadAll(
      buildPlacesReadSql(buildPlacesValuesSql(rows)),
    );
    return parsePlaceRowsFromQueryRows(result.getRowObjectsJson());
  });
}

async function _describe(rows: readonly PlaceRow[]): Promise<string[][]> {
  return await withDuckDb(async (connection) => {
    const described = await connection.runAndReadAll(
      `DESCRIBE ${buildPlacesValuesSql(rows)}`,
    );
    return described.getRowObjects().map((column) => {
      return [String(column.column_name), String(column.column_type)];
    });
  });
}

describe("places SQL round trip", () => {
  it("reads back exactly the rows it wrote", async () => {
    expect(await _readBack(ROWS)).toEqual(ROWS);
  });

  it("reads back no rows from an empty places dataset", async () => {
    expect(await _readBack([])).toEqual([]);
  });

  it.each([
    ["with places", ROWS],
    ["when empty", []],
  ])("declares the places columns and types %s", async (_label, rows) => {
    expect(await _describe(rows)).toEqual(
      PLACES_COLUMNS.map((column) => {
        return [column.name, column.duckDbType];
      }),
    );
  });
});
