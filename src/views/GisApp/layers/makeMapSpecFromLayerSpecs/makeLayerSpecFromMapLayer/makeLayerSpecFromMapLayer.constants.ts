/** Highlight applied to the feature the user has selected. */
export const SELECTED_STROKE_COLOR = "#ffd700";

/**
 * Feature count above which a point layer clusters automatically, whatever
 * symbology the author picked.
 *
 * MapLibre only clusters points that fall within `clusterRadius` pixels of
 * one another, so geographically spread data still renders individually no
 * matter how this threshold is set: it does not make sparse data readable.
 * What the threshold governs is render cost, not readability. 10,000 is
 * roughly where unclustered `circle` rendering with data-driven styling
 * starts to cost on the field laptops and tablets this app targets.
 */
export const CLUSTER_AUTO_THRESHOLD = 10_000;
