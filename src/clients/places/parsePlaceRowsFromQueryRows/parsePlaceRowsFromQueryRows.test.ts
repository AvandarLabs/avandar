import { describe, expect, it } from "vitest";
import { parsePlaceRowsFromQueryRows } from "@/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows";

const QUERY_ROW = {
  place_id: "p1",
  name: "Clinic",
  address: null,
  latitude: 40.7,
  longitude: -73.9,
  starts_at: "2026-10-02T18:00",
  ends_at: null,
  notes: "",
};

describe("parsePlaceRowsFromQueryRows", () => {
  it("maps snake_case query columns to a place row, nulls to undefined", () => {
    expect(parsePlaceRowsFromQueryRows([QUERY_ROW])).toEqual([
      {
        placeId: "p1",
        name: "Clinic",
        address: undefined,
        latitude: 40.7,
        longitude: -73.9,
        startsAt: "2026-10-02T18:00",
        endsAt: undefined,
        notes: undefined,
      },
    ]);
  });

  it("refuses a row from a dataset that is not a places dataset", () => {
    expect(() => {
      return parsePlaceRowsFromQueryRows([{ one: 1 }]);
    }).toThrow("This dataset's rows are not places.");
  });
});
