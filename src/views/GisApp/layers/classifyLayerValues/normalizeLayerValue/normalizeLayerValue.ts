import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Applies an optional per-unit denominator to one numeric layer value. */
export function normalizeLayerValue(
  value: unknown,
  denominator: unknown,
  multiplier: MapLayer.Normalization["multiplier"],
): number | undefined {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    typeof denominator !== "number" ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return undefined;
  }
  return (value / denominator) * multiplier;
}
