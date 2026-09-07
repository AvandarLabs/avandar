import type {
  DisputedStatusValues, // oxfmt-ignore
} from "$/models/AvaMap/MapLayer/DisputedStatus.types.ts";
import type { MapLayerRead } from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

/** No values assigned: every outline renders as settled. */
export const EMPTY_DISPUTED_STATUS_VALUES: DisputedStatusValues = {
  disputed: [],
  undetermined: [],
};

/**
 * True when a layer may carry a disputed-status bind.
 *
 * Buffer rings and grid cells are excluded because they are derived geometry,
 * not administrative boundaries: dashing them would assert a dispute the data
 * never claimed.
 */
export function canBindDisputedStatus(layer: MapLayerRead): boolean {
  const isOutlineSymbology =
    layer.symbology.type === "fill" || layer.symbology.type === "line";
  const binding = layer.geoBinding?.type;
  const isBoundaryBinding =
    binding === "geometryColumn" ||
    binding === "joinToBoundaries" ||
    binding === "aggregatePointsToBoundaries";
  return isOutlineSymbology && isBoundaryBinding;
}

/** True when no value appears in both the disputed and undetermined lists. */
export function areDisputedStatusValuesDisjoint(
  values: DisputedStatusValues,
): boolean {
  const disputed = new Set(values.disputed);
  return !values.undetermined.some((value) => {
    return disputed.has(value);
  });
}
