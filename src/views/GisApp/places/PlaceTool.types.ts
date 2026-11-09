import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  PlaceCoordinate,
  PlaceInput,
  PlaceRow,
} from "@/clients/places/places.types";
import type { GeocodeBiasBox } from "@sbfn/geocode/GeocoderProvider.types";

/** The place form's text fields, as typed. */
export type PlaceDraftValues = {
  name: string;
  address: string;
  startsAt: string;
  endsAt: string;
  notes: string;
};

/** The place being added, edited, or moved, while the place tool is open. */
export type PlaceDraft = {
  /** The dataset an edit or move writes to; a new place uses the map's. */
  datasetId: Dataset.Id | undefined;

  /** The place being edited or moved; `undefined` for a new place. */
  placeId: string | undefined;
  coordinate: PlaceCoordinate | undefined;
  values: PlaceDraftValues;

  /** True when the address came from address search (needs OSM attribution). */
  isAddressFromSearch: boolean;
};

/** The draft and the only ways to change it. `undefined` draft means closed. */
export type PlaceToolState = {
  draft: PlaceDraft | undefined;
  startNew: () => void;
  startEdit: (options: { datasetId: Dataset.Id; row: PlaceRow }) => void;
  startMove: (options: { datasetId: Dataset.Id; row: PlaceRow }) => void;
  onPlacePicked: (coordinate: PlaceCoordinate) => void;
  onSearchResultPicked: (options: {
    coordinate: PlaceCoordinate;
    address: string;
  }) => void;
  clearCoordinate: () => void;
  close: () => void;
};

/** A place shown on the map: its dataset and its row id. */
export type PlaceFeatureTarget = { datasetId: Dataset.Id; placeId: string };

/** What the feature inspector may do to a clicked place. */
export type PlaceFeatureActionHandlers = {
  placesDatasetIds: ReadonlySet<Dataset.Id>;
  onEdit: (target: PlaceFeatureTarget) => void;
  onMove: (target: PlaceFeatureTarget) => void;
  onDelete: (target: PlaceFeatureTarget) => void;
};

/**
 * Everything the "Add a place" tool and the feature inspector need, built
 * by `usePlaceTool` from the GIS app state.
 */
export type PlaceToolController = {
  state: PlaceToolState;
  isArmed: boolean;
  isSaving: boolean;

  /** The places dataset a new place is saved to: the first one on the map. */
  targetDatasetId: Dataset.Id | undefined;
  placesDatasetOptions: ReadonlyArray<{ value: Dataset.Id; label: string }>;
  getBiasBox: () => GeocodeBiasBox | undefined;
  armMapPick: () => void;
  createPlacesDataset: (datasetName: string) => void;
  addPlacesLayer: (datasetId: Dataset.Id) => void;
  savePlace: (input: PlaceInput) => void;
  featureActions: PlaceFeatureActionHandlers;
};
