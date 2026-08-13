import { isDefined } from "@avandar/utils";
import { toFiniteNumber } from "@/views/GisApp/layers/toFiniteNumber";

/** Summary statistics a layer's paint expressions need. */
export type LayerStats = {
  /**
   * Minimum and maximum of the layer's value column, or `undefined` when no
   * feature carries a numeric value.
   */
  valueDomain: [number, number] | undefined;
};

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

  const values = featureCollection.features
    .map((feature) => {
      return toFiniteNumber(feature.properties?.[valueColumnName]);
    })
    .filter(isDefined);

  if (values.length === 0) {
    return { valueDomain: undefined };
  }

  // Reduce rather than Math.min(...values): a large layer would otherwise
  // exceed the argument limit and throw.
  return {
    valueDomain: [
      values.reduce((smallest, value) => {
        return Math.min(smallest, value);
      }),
      values.reduce((largest, value) => {
        return Math.max(largest, value);
      }),
    ],
  };
}
