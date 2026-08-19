import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Smallest allowed buffer distance, in meters. */
const MIN_BUFFER_DISTANCE_METERS = 100;

/** Largest allowed buffer distance, in meters. */
const MAX_BUFFER_DISTANCE_METERS = 1_000_000;

function _clampBufferDistanceMeters(distanceMeters: number): number {
  return Math.min(
    MAX_BUFFER_DISTANCE_METERS,
    Math.max(MIN_BUFFER_DISTANCE_METERS, distanceMeters),
  );
}

function _withBufferDistanceMeters(
  options: Readonly<{ layer: MapLayer.T; distanceMeters: number }>,
): MapLayer.T {
  const { layer, distanceMeters } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "bufferOfLayer" || !Number.isFinite(distanceMeters)) {
    return layer;
  }
  const clampedDistanceMeters = _clampBufferDistanceMeters(distanceMeters);
  if (binding.distanceMeters === clampedDistanceMeters) {
    return layer;
  }
  return {
    ...layer,
    geoBinding: { ...binding, distanceMeters: clampedDistanceMeters },
  } as MapLayer.T;
}

function _withBufferDissolve(
  options: Readonly<{ layer: MapLayer.T; dissolve: boolean }>,
): MapLayer.T {
  const { layer, dissolve } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "bufferOfLayer" || binding.dissolve === dissolve) {
    return layer;
  }
  return { ...layer, geoBinding: { ...binding, dissolve } } as MapLayer.T;
}

/** Buffer distance and dissolve updates for a map layer. */
export const bufferBindingUpdates = {
  /** Sets and clamps the buffer distance used for a buffer-of-layer binding. */
  withBufferDistanceMeters: _withBufferDistanceMeters,

  /** Sets whether overlapping buffer rings are unioned into one feature. */
  withBufferDissolve: _withBufferDissolve,
};
