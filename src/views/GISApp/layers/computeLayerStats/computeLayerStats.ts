/** Summary statistics a layer's paint expressions need. */
export type LayerStats = {
  /**
   * Minimum and maximum of the layer's value column, or `undefined` when no
   * feature carries a numeric value.
   */
  valueDomain: readonly [number, number] | undefined;
};

function _toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Summarizes a feature collection for data-driven paint.
 * @param params.valueColumnName Feature property to summarize, or `undefined`
 * when the symbology needs no value.
 */
export function computeLayerStats({
  featureCollection,
  valueColumnName,
}: {
  featureCollection: GeoJSON.FeatureCollection;
  valueColumnName: string | undefined;
}): LayerStats {
  if (!valueColumnName) {
    return { valueDomain: undefined };
  }
  let minimum = Infinity;
  let maximum = -Infinity;
  let hasValue = false;

  featureCollection.features.forEach((feature) => {
    const value = _toFiniteNumber(feature.properties?.[valueColumnName]);
    if (value === undefined) {
      return;
    }
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    hasValue = true;
  });

  return { valueDomain: hasValue ? [minimum, maximum] : undefined };
}
