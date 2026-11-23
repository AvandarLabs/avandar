import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { makeFeatureCollectionFromRows } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import fixtures from "../fixtures.json";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

const _noop = () => {
  return undefined;
};
/** Pan interaction mode for the map reenactment. */
export const PAN = { type: "pan" } as const;
// Resolve the product's own Avandar style through its unchanged BasemapStyle.
// Real basemap geography supplies context; the overlaid records remain
// fictional.
/** The product basemap selection used by the map reenactment. */
export const BASEMAP = { type: "builtIn", style: "avandar" } as const;
/** Provider attribution displayed with the reenactment basemap. */
export const BASEMAP_ATTRIBUTION =
  "OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap";

type PointLayerOptions = {
  name: string;
  id: string;
  color: string;
  radius: number;
};

/**
 * Builds a product `MapLayer.Standard` circle layer bound to latitude/longitude
 * columns.
 */
function _createPointLayer({ name, id, color, radius }: PointLayerOptions) {
  const layer = MapLayer.makeEmpty(name);
  return {
    ...layer,
    id,
    geoBinding: {
      type: "latLngColumns",
      latitude: "latitude",
      longitude: "longitude",
    },
    symbology: {
      ...layer.symbology,
      type: "circle",
      color: { type: "single", color },
      radius,
    },
  } as MapLayer.Standard;
}

/** Point layer for fictional Harborfield cases in the map reenactment. */
export const caseLayer = _createPointLayer({
  name: "Video - Harborfield cases",
  id: "film-cases",
  color: "#228be6",
  radius: 4,
});
/** Point layer for fictional Harborfield facilities in the map film. */
export const facilityLayer = _createPointLayer({
  name: "Video - Harborfield facilities",
  id: "film-facilities",
  color: "#f08c00",
  radius: 8,
});
const binding = {
  type: "latLngColumns",
  latitudeColumnName: "latitude",
  longitudeColumnName: "longitude",
} as const;
/** GeoJSON case features derived from the fictional map fixture rows. */
export const casePoints = makeFeatureCollectionFromRows({
  rows: fixtures.cases,
  binding,
  propertyColumnNames: "all",
  sensitivity: { mode: "exact" },
  layerId: caseLayer.id,
  // Exact layers never jitter, so no map salt is read.
  jitterSalt: "",
});
/** GeoJSON facility features derived from the fictional fixture rows. */
export const facilityPoints = makeFeatureCollectionFromRows({
  rows: fixtures.facilities,
  binding,
  propertyColumnNames: "all",
  sensitivity: { mode: "exact" },
  layerId: facilityLayer.id,
  // Exact layers never jitter, so no map salt is read.
  jitterSalt: "",
});
/** Facility feature selected in the map reenactment. */
export const selectedFacility = facilityPoints.featureCollection.features[2]!;
/** Coordinates of the selected map reenactment facility. */
export const selectedCoordinates = (selectedFacility.geometry as GeoJSON.Point)
  .coordinates as [number, number];

/**
 * A ready, error-free view state for a layer with `count` rendered features.
 */
function _createViewState(numFeatures: number): MapLayerViewState {
  return {
    status: "ready",
    error: undefined,
    featureCount: numFeatures,
    droppedRowCount: 0,
    drops: [],
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: _noop,
  };
}
/** Initial view state for each fictional map reenactment layer. */
export const viewStates = new Map([
  [
    caseLayer.id,
    _createViewState(casePoints.featureCollection.features.length),
  ],
  [
    facilityLayer.id,
    _createViewState(facilityPoints.featureCollection.features.length),
  ],
]);

/** Body-local time and rendered-element identities for the movie cursor. */
export const MAP_BEATS = [
  { frame: 90, target: "map-facilities-layer", action: "click" },
  { frame: 200, target: "map-data-section", action: "click" },
  { frame: 300, target: "map-facilities-visibility", action: "click" },
  { frame: 380, target: "map-facilities-visibility", action: "click" },
  { frame: 440, target: "map-facility-point", action: "point" },
  { frame: 540, target: "map-facility-point", action: "click" },
] as const;
/** Duration of the map reenactment, in frames. */
export const MAP_DURATION = 720;
