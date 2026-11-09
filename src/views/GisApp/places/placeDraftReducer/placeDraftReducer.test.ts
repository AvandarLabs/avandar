import { describe, expect, it } from "vitest";
import { placeDraftReducer } from "@/views/GisApp/places/placeDraftReducer/placeDraftReducer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceRow } from "@/clients/places/places.types";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const ROW: PlaceRow = {
  placeId: "p1",
  name: "Clinic",
  address: undefined,
  latitude: 40.7,
  longitude: -73.9,
  startsAt: "2026-10-02T18:00",
  endsAt: undefined,
  notes: "Side door",
};
const NYC = { latitude: 40.7603, longitude: -73.9885 };

describe("placeDraftReducer", () => {
  it("opens an empty draft for a new place", () => {
    expect(placeDraftReducer(undefined, { type: "startNew" })).toEqual({
      datasetId: undefined,
      placeId: undefined,
      coordinate: undefined,
      values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
      isAddressFromSearch: false,
    });
  });

  it("opens an edit with the row's values and location", () => {
    const draft = placeDraftReducer(undefined, {
      type: "startEdit",
      datasetId: DATASET_ID,
      row: ROW,
    });
    expect(draft).toMatchObject({
      datasetId: DATASET_ID,
      placeId: "p1",
      coordinate: { latitude: 40.7, longitude: -73.9 },
      values: {
        name: "Clinic",
        startsAt: "2026-10-02T18:00",
        endsAt: "",
        notes: "Side door",
      },
    });
  });

  it("opens a move with the row's values but no location yet", () => {
    const draft = placeDraftReducer(undefined, {
      type: "startMove",
      datasetId: DATASET_ID,
      row: ROW,
    });
    expect(draft?.coordinate).toBeUndefined();
    expect(draft?.values.name).toBe("Clinic");
  });

  it("starts a new place from a picked point when nothing is open", () => {
    expect(
      placeDraftReducer(undefined, { type: "pickCoordinate", coordinate: NYC })
        ?.coordinate,
    ).toEqual(NYC);
  });

  it("keeps a move's values when its new point is picked", () => {
    const moving = placeDraftReducer(undefined, {
      type: "startMove",
      datasetId: DATASET_ID,
      row: ROW,
    });
    const picked = placeDraftReducer(moving, {
      type: "pickCoordinate",
      coordinate: NYC,
    });
    expect(picked).toMatchObject({
      placeId: "p1",
      coordinate: NYC,
      values: { name: "Clinic" },
    });
  });

  it("fills the address from a search result and marks it for attribution", () => {
    const draft = placeDraftReducer(undefined, {
      type: "pickSearchResult",
      coordinate: NYC,
      address: "350 West 46th Street",
    });
    expect(draft).toMatchObject({
      coordinate: NYC,
      values: { address: "350 West 46th Street" },
      isAddressFromSearch: true,
    });
  });

  it("keeps the typed values when the user changes the location", () => {
    const editing = placeDraftReducer(undefined, {
      type: "startEdit",
      datasetId: DATASET_ID,
      row: ROW,
    });
    const typed = {
      name: "Typed name",
      address: "",
      startsAt: "",
      endsAt: "",
      notes: "Typed notes",
    };
    expect(
      placeDraftReducer(editing, { type: "clearCoordinate", values: typed })
        ?.values,
    ).toEqual(typed);
  });

  it("forgets the location when the user changes it", () => {
    const editing = placeDraftReducer(undefined, {
      type: "startEdit",
      datasetId: DATASET_ID,
      row: ROW,
    });
    expect(
      placeDraftReducer(editing, {
        type: "clearCoordinate",
        values: editing!.values,
      })?.coordinate,
    ).toBeUndefined();
  });

  it("closes the draft", () => {
    const editing = placeDraftReducer(undefined, { type: "startNew" });
    expect(placeDraftReducer(editing, { type: "close" })).toBeUndefined();
  });
});
