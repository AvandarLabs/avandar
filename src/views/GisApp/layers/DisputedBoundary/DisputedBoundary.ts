import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Feature property carrying the raw disputed-status value. */
const DISPUTED_STATUS_PROPERTY = "__avandar_disputed_status";

/**
 * Casing ink for disputed and undetermined outlines. Deliberately never the
 * layer's own stroke color, so a dashed casing can never be mistaken for a
 * settled boundary's line. Every PDF export uses the light value, because
 * the printed page is always light regardless of the on-screen theme.
 */
const CASING_COLORS = { light: "#555555", dark: "#b7b7b7" } as const;

/** Dash pattern for the casing line, in MapLibre pixels. */
const CASING_DASHARRAY: readonly [number, number] = [3, 2];

/**
 * Classification, paint constants, and the reserved feature property for
 * disputed and undetermined administrative boundaries.
 *
 * This module exists so a boundary whose status is disputed or undetermined
 * can never be drawn as an ordinary settled line: a solid line reads as a
 * claim about sovereignty, and these humanitarian sitrep maps must never
 * make that claim by omission.
 */
export const DisputedBoundary = {
  /** Feature property carrying the raw disputed-status value. */
  propertyName: DISPUTED_STATUS_PROPERTY,

  /** Casing ink, keyed by canvas (screen light/dark, or PDF). */
  casingColors: CASING_COLORS,

  /** Dash pattern for the casing line, in MapLibre pixels. */
  dasharray: CASING_DASHARRAY,

  /**
   * Classifies a single feature's disputed status from its raw value.
   *
   * Anything not explicitly listed in `values` is settled, including
   * `null`, `undefined`, a missing property, and any non-string value. This
   * fail-safe direction is deliberate: if a bound column fails to resolve
   * or produces an unexpected type, the map renders ordinary settled lines
   * rather than dashing every boundary on the map. The reverse failure mode
   * (silently treating a real dispute as settled) is the one this whole
   * feature exists to prevent, so the classifier must never guess "settled"
   * is wrong when it lacks a positive match, and must never guess
   * "disputed" when it lacks one either.
   */
  getStatusFromValue: (
    options: Readonly<{
      value: unknown;
      values: MapLayer.DisputedStatusValues;
    }>,
  ): MapLayer.DisputedStatus => {
    const { value, values } = options;
    if (typeof value !== "string") {
      return "settled";
    }
    if (values.disputed.includes(value)) {
      return "disputed";
    }
    return values.undetermined.includes(value) ? "undetermined" : "settled";
  },

  /**
   * True when at least one feature actually drawn on the map is disputed or
   * undetermined.
   *
   * Returns `false` whenever both value arrays are empty, even if drawn
   * features carry matching-looking property values: an author who bound a
   * column but assigned no values to either list has made no claim about
   * any feature, so no legend row should appear for it. This check happens
   * before scanning features so an unbound layer never pays the scan cost.
   */
  hasDrawnDisputedFeature: (
    options: Readonly<{
      values: MapLayer.DisputedStatusValues;
      featureCollection: GeoJSON.FeatureCollection;
    }>,
  ): boolean => {
    const { values, featureCollection } = options;
    if (values.disputed.length === 0 && values.undetermined.length === 0) {
      return false;
    }
    return featureCollection.features.some((feature) => {
      return (
        DisputedBoundary.getStatusFromValue({
          value: feature.properties?.[DISPUTED_STATUS_PROPERTY],
          values,
        }) !== "settled"
      );
    });
  },
};
