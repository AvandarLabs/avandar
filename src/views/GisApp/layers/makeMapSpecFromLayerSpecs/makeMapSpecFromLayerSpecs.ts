import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

/**
 * Merges per-layer specs into one map spec, preserving the given order as
 * draw order (first entry is drawn at the bottom).
 */
export function makeMapSpecFromLayerSpecs(layerSpecs: readonly MapSpec[]): MapSpec {
  return layerSpecs.reduce<MapSpec>(
    (merged, layerSpec) => {
      return {
        sources: { ...merged.sources, ...layerSpec.sources },
        layers: [...merged.layers, ...layerSpec.layers],
      };
    },
    { sources: {}, layers: [] },
  );
}
