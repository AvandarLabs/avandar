import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Smallest buffer distance the buffer tool and inspector accept, in meters. */
const MIN_BUFFER_DISTANCE_METERS = 100;

/** Largest buffer distance the buffer tool and inspector accept, in meters. */
const MAX_BUFFER_DISTANCE_METERS = 1_000_000;

/** Buffer distances are typed and shown to two decimal places. */
const HUNDREDTHS = 100;

/**
 * Scales to hundredths and drops float noise, so 0.1 km * 100 is 10 rather
 * than 10.000000000000002 before it is rounded.
 */
function _toHundredths(distance: number): number {
  return Number((distance * HUNDREDTHS).toFixed(6));
}

/** The buffer distance limits, in one buffer distance unit. */
export type BufferDistanceLimits = {
  minDistance: number;
  maxDistance: number;
};

/**
 * The meter limits restated in `unit`, to two decimals. The minimum rounds
 * up and the maximum rounds down, so both stay within the meter limits.
 */
export function getBufferDistanceLimitsFromUnit(
  unit: MapLayer.BufferDistanceUnit,
): BufferDistanceLimits {
  const minDistance = MapLayer.getBufferDistanceFromMeters({
    distanceMeters: MIN_BUFFER_DISTANCE_METERS,
    unit,
  });
  const maxDistance = MapLayer.getBufferDistanceFromMeters({
    distanceMeters: MAX_BUFFER_DISTANCE_METERS,
    unit,
  });
  return {
    minDistance: Math.ceil(_toHundredths(minDistance)) / HUNDREDTHS,
    maxDistance: Math.floor(_toHundredths(maxDistance)) / HUNDREDTHS,
  };
}

/** A distance in `unit`, held within that unit's limits. */
export function clampBufferDistance(
  options: Readonly<{ distance: number; unit: MapLayer.BufferDistanceUnit }>,
): number {
  const { minDistance, maxDistance } = getBufferDistanceLimitsFromUnit(
    options.unit,
  );
  return Math.min(maxDistance, Math.max(minDistance, options.distance));
}

/**
 * Restates a distance typed in `fromUnit` in `toUnit`, rounded to two
 * decimals and held within the new unit's limits. For example, 1000 m
 * becomes 0.62 mi.
 */
export function convertBufferDistance(
  options: Readonly<{
    distance: number;
    fromUnit: MapLayer.BufferDistanceUnit;
    toUnit: MapLayer.BufferDistanceUnit;
  }>,
): number {
  const distanceMeters = MapLayer.getMetersFromBufferDistance({
    distance: options.distance,
    unit: options.fromUnit,
  });
  const convertedDistance = MapLayer.getBufferDistanceFromMeters({
    distanceMeters,
    unit: options.toUnit,
  });
  return clampBufferDistance({
    distance: Math.round(_toHundredths(convertedDistance)) / HUNDREDTHS,
    unit: options.toUnit,
  });
}
