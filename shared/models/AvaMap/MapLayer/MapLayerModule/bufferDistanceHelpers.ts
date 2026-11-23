import type { BufferDistanceUnit } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";

/** Meters in one of each buffer distance unit. */
const METERS_PER_BUFFER_DISTANCE_UNIT: Readonly<
  Record<BufferDistanceUnit, number>
> = {
  m: 1,
  km: 1000,
  ft: 0.3048,
  mi: 1609.344,
};

/**
 * Whole meters for a distance typed in `unit`, which is how a buffer
 * persists its distance. For example, "0.5 mi" becomes 805.
 */
export function getMetersFromBufferDistance(
  options: Readonly<{ distance: number; unit: BufferDistanceUnit }>,
): number {
  return Math.round(
    options.distance * METERS_PER_BUFFER_DISTANCE_UNIT[options.unit],
  );
}

/**
 * A meter distance restated in `unit`. Use it to show a buffer's distance, or
 * a feature's distance to the nearest site, in the unit the buffer was typed
 * in.
 */
export function getBufferDistanceFromMeters(
  options: Readonly<{ distanceMeters: number; unit: BufferDistanceUnit }>,
): number {
  return options.distanceMeters / METERS_PER_BUFFER_DISTANCE_UNIT[options.unit];
}
