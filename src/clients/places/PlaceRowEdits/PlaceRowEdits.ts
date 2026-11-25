import { propEq } from "@avandar/utils";
import { PLACES_MAX_ROWS } from "@/clients/places/places.constants";
import type { PlaceInput, PlaceRow } from "@/clients/places/places.types";

/** The rows after one edit, or why the edit did not apply. */
export type PlaceEditResult =
  | { type: "ok"; rows: PlaceRow[] }
  | { type: "limitReached" }
  | { type: "notFound" };

function _withPlaceAdded(
  options: Readonly<{
    rows: readonly PlaceRow[];
    placeId: string;
    place: PlaceInput;
  }>,
): PlaceEditResult {
  if (options.rows.length >= PLACES_MAX_ROWS) {
    return { type: "limitReached" };
  }
  return {
    type: "ok",
    rows: [...options.rows, { ...options.place, placeId: options.placeId }],
  };
}

function _withPlaceReplaced(
  options: Readonly<{
    rows: readonly PlaceRow[];
    placeId: string;
    place: PlaceInput;
  }>,
): PlaceEditResult {
  if (!options.rows.some(propEq("placeId", options.placeId))) {
    return { type: "notFound" };
  }
  return {
    type: "ok",
    rows: options.rows.map((row) => {
      return row.placeId === options.placeId
        ? { ...options.place, placeId: options.placeId }
        : row;
    }),
  };
}

function _withPlaceRemoved(
  options: Readonly<{ rows: readonly PlaceRow[]; placeId: string }>,
): PlaceEditResult {
  if (!options.rows.some(propEq("placeId", options.placeId))) {
    return { type: "notFound" };
  }
  return {
    type: "ok",
    rows: options.rows.filter((row) => {
      return row.placeId !== options.placeId;
    }),
  };
}

/**
 * Applies one edit to a places dataset's rows and enforces its 500-place
 * cap. Use it between reading the rows and rewriting them, for example when
 * the place tool saves or deletes a place.
 */
export const PlaceRowEdits = {
  withPlaceAdded: _withPlaceAdded,
  withPlaceReplaced: _withPlaceReplaced,
  withPlaceRemoved: _withPlaceRemoved,
};
