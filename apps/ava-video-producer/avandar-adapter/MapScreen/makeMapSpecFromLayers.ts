import { prop } from "@avandar/utils";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { caseLayer, casePoints, facilityPoints } from "./mapFixtures";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

/**
 * Builds the native MapLibre spec for the given layers, disabling paint
 * transitions for deterministic seeks.
 */
export function makeMapSpecFromLayers(layers: readonly MapLayer.T[]): MapSpec {
  const specs = layers.map((layer) => {
    return makeLayerSpecFromMapLayer({
      layer,
      featureCollection:
        layer.id === caseLayer.id
          ? casePoints.featureCollection
          : facilityPoints.featureCollection,
      stats: { valueDomain: undefined },
    });
  });
  return {
    sources: Object.assign({}, ...specs.map(prop("sources"))),
    layers: specs.flatMap(prop("layers")).map((layer) => {
      return {
        ...layer,
        // A render seek must never leave native MapLibre paint in a
        // wall-clock transition. Colors/radii themselves remain the source
        // layer output.
        paint: {
          ...layer.paint,
          "circle-opacity-transition": { duration: 0, delay: 0 },
          "circle-color-transition": { duration: 0, delay: 0 },
          "circle-radius-transition": { duration: 0, delay: 0 },
        },
      };
    }),
  };
}
