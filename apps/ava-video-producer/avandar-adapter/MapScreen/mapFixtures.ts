import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { makeFeatureCollectionFromRows } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import fixtures from "../fixtures.json";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

const _noop = () => undefined;
export const PAN = { type: "pan" } as const;
// Resolve the product's own Avandar style through its unchanged BasemapStyle.
// Real basemap geography supplies context; the overlaid records remain fictional.
export const BASEMAP = { type: "builtIn", style: "avandar" } as const;
export const BASEMAP_ATTRIBUTION =
  "OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap";

type PointLayerOptions = {
  name: string;
  id: string;
  color: string;
  radius: number;
};

/** Builds a product `MapLayer.Standard` circle layer bound to latitude/longitude columns. */
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

export const caseLayer = _createPointLayer({
  name: "Video - Harborfield cases",
  id: "film-cases",
  color: "#228be6",
  radius: 4,
});
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
export const casePoints = makeFeatureCollectionFromRows({
  rows: fixtures.cases,
  binding,
  propertyColumnNames: "all",
  sensitivity: { mode: "exact" },
  layerId: caseLayer.id,
});
export const facilityPoints = makeFeatureCollectionFromRows({
  rows: fixtures.facilities,
  binding,
  propertyColumnNames: "all",
  sensitivity: { mode: "exact" },
  layerId: facilityLayer.id,
});
export const selectedFacility = facilityPoints.featureCollection.features[2]!;
export const selectedCoordinates = (selectedFacility.geometry as GeoJSON.Point)
  .coordinates as [number, number];

/** A ready, error-free view state for a layer with `count` rendered features. */
function _createViewState(count: number): MapLayerViewState {
  return {
    status: "ready",
    error: undefined,
    featureCount: count,
    droppedRowCount: 0,
    drops: [],
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: _noop,
  };
}
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
export const MAP_DURATION = 720;

/** Builds the native MapLibre spec for the given layers, disabling paint transitions for deterministic seeks. */
export function _createSpec(layers: readonly MapLayer.T[]): MapSpec {
  const specs = layers.map((layer) =>
    makeLayerSpecFromMapLayer({
      layer,
      featureCollection:
        layer.id === caseLayer.id
          ? casePoints.featureCollection
          : facilityPoints.featureCollection,
      stats: { valueDomain: undefined },
    }),
  );
  return {
    sources: Object.assign({}, ...specs.map((spec) => spec.sources)),
    layers: specs
      .flatMap((spec) => spec.layers)
      .map((layer) => ({
        ...layer,
        // A render seek must never leave native MapLibre paint in a wall-clock
        // transition. Colors/radii themselves remain the source layer output.
        paint: {
          ...layer.paint,
          "circle-opacity-transition": { duration: 0, delay: 0 },
          "circle-color-transition": { duration: 0, delay: 0 },
          "circle-radius-transition": { duration: 0, delay: 0 },
        },
      })),
  } as MapSpec;
}
