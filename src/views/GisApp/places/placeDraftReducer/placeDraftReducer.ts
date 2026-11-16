import { match } from "ts-pattern";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceCoordinate, PlaceRow } from "@/clients/places/places.types";
import type {
  PlaceDraft,
  PlaceDraftValues,
} from "@/views/GisApp/places/PlaceTool.types";

/** Every change the tool, map, Go-to box, or inspector makes to a draft. */
export type PlaceDraftAction =
  | { type: "startNew" }
  | { type: "startEdit"; datasetId: Dataset.Id; row: PlaceRow }
  | { type: "startMove"; datasetId: Dataset.Id; row: PlaceRow }
  | { type: "pickCoordinate"; coordinate: PlaceCoordinate }
  | { type: "pickSearchResult"; coordinate: PlaceCoordinate; address: string }
  | { type: "clearCoordinate"; values: PlaceDraftValues }
  | { type: "close" };

function _createNewDraft(): PlaceDraft {
  return {
    datasetId: undefined,
    placeId: undefined,
    coordinate: undefined,
    values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
    isAddressFromSearch: false,
  };
}

function _createDraftFromRow(
  options: Readonly<{
    datasetId: Dataset.Id;
    row: PlaceRow;
    keepsCoordinate: boolean;
  }>,
): PlaceDraft {
  const { row } = options;
  return {
    datasetId: options.datasetId,
    placeId: row.placeId,
    coordinate: options.keepsCoordinate
      ? { latitude: row.latitude, longitude: row.longitude }
      : undefined,
    values: {
      name: row.name,
      address: row.address ?? "",
      startsAt: row.startsAt ?? "",
      endsAt: row.endsAt ?? "",
      notes: row.notes ?? "",
    },
    isAddressFromSearch: false,
  };
}

/**
 * The place tool's draft state machine, used by `usePlaceToolState`. A
 * picked point with no open draft starts a new place, so a map click or a
 * Go-to result can open the tool by itself.
 */
export function placeDraftReducer(
  draft: PlaceDraft | undefined,
  action: PlaceDraftAction,
): PlaceDraft | undefined {
  return match(action)
    .with({ type: "startNew" }, () => {
      return _createNewDraft();
    })
    .with({ type: "startEdit" }, (edit) => {
      return _createDraftFromRow({ ...edit, keepsCoordinate: true });
    })
    .with({ type: "startMove" }, (move) => {
      return _createDraftFromRow({ ...move, keepsCoordinate: false });
    })
    .with({ type: "pickCoordinate" }, (pick) => {
      return { ...(draft ?? _createNewDraft()), coordinate: pick.coordinate };
    })
    .with({ type: "pickSearchResult" }, (pick) => {
      const base = draft ?? _createNewDraft();
      return {
        ...base,
        coordinate: pick.coordinate,
        values: { ...base.values, address: pick.address },
        isAddressFromSearch: true,
      };
    })
    .with({ type: "clearCoordinate" }, (clear) => {
      return draft
        ? { ...draft, coordinate: undefined, values: clear.values }
        : draft;
    })
    .with({ type: "close" }, () => {
      return undefined;
    })
    .exhaustive();
}
