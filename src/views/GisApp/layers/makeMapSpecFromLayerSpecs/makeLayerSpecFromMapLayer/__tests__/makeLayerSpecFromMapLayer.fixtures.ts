import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerStats } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * Shared fixtures for `makeLayerSpecFromMapLayer` paint tests.
 *
 * The symbology's `value` is a QueryColumnId, not the layer id: a layer id
 * there type-checks nowhere and would mask a real wiring mistake.
 */
export const valueColumnId = uuid<QueryColumn.Id>();

/**
 * Fixed layer id for `makeFillLayerFixture`, so two independently created
 * fixture layers compare equal: a random id per call would make any
 * cross-invocation `toEqual` fail regardless of the paint under test.
 */
const FILL_LAYER_ID = uuid<MapLayer.Id>();

/** One point feature used by every paint-spec case. */
export const featureCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: 0,
      geometry: { type: "Point", coordinates: [15, -4] },
      properties: { cases: 12 },
    },
  ],
};

/** Stats with no numeric value domain, for paint tests that ignore it. */
export const EMPTY_STATS: LayerStats = { valueDomain: undefined };

/** An exact, unbound polygon layer used by fill and casing paint tests. */
export function makeFillLayerFixture(): MapLayer.Standard & {
  symbology: MapLayer.FillSymbology;
} {
  return {
    ...MapLayer.createArea("Districts"),
    id: FILL_LAYER_ID,
  } as MapLayer.Standard & { symbology: MapLayer.FillSymbology };
}
