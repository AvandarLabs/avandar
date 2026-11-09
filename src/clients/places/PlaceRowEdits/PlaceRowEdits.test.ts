import { describe, expect, it } from "vitest";
import { PlaceRowEdits } from "@/clients/places/PlaceRowEdits/PlaceRowEdits";
import type { PlaceInput, PlaceRow } from "@/clients/places/places.types";

const PLACE: PlaceInput = {
  name: "Clinic",
  address: undefined,
  latitude: 40.7,
  longitude: -73.9,
  startsAt: undefined,
  endsAt: undefined,
  notes: undefined,
};

function _makeRows(count: number): PlaceRow[] {
  return Array.from({ length: count }, (_unused, index) => {
    return { ...PLACE, placeId: `p${index}` };
  });
}

describe("PlaceRowEdits", () => {
  it("appends a new place with its id", () => {
    expect(
      PlaceRowEdits.withPlaceAdded({
        rows: _makeRows(1),
        placeId: "new",
        place: PLACE,
      }),
    ).toEqual({
      type: "ok",
      rows: [..._makeRows(1), { ...PLACE, placeId: "new" }],
    });
  });

  it("refuses the 501st place", () => {
    expect(
      PlaceRowEdits.withPlaceAdded({
        rows: _makeRows(500),
        placeId: "new",
        place: PLACE,
      }),
    ).toEqual({ type: "limitReached" });
  });

  it("replaces only the place with the matching id, keeping its position", () => {
    const result = PlaceRowEdits.withPlaceReplaced({
      rows: _makeRows(3),
      placeId: "p1",
      place: { ...PLACE, name: "Moved clinic", latitude: 41 },
    });
    expect(
      result.type === "ok" ? result.rows.map((row) => {return row.name}) : [],
    ).toEqual(["Clinic", "Moved clinic", "Clinic"]);
  });

  it("reports a replaced place that someone else already deleted", () => {
    expect(
      PlaceRowEdits.withPlaceReplaced({
        rows: _makeRows(1),
        placeId: "gone",
        place: PLACE,
      }),
    ).toEqual({ type: "notFound" });
  });

  it("removes the place with the matching id", () => {
    const result = PlaceRowEdits.withPlaceRemoved({
      rows: _makeRows(2),
      placeId: "p0",
    });
    expect(result).toEqual({ type: "ok", rows: [{ ...PLACE, placeId: "p1" }] });
  });

  it("reports a removed place that is already gone", () => {
    expect(PlaceRowEdits.withPlaceRemoved({ rows: [], placeId: "p0" })).toEqual(
      { type: "notFound" },
    );
  });
});
