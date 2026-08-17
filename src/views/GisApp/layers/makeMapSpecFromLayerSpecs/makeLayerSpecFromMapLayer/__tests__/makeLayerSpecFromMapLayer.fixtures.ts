import { uuid } from "$/lib/uuid";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * Shared fixtures for `makeLayerSpecFromMapLayer` paint tests.
 *
 * The symbology's `value` is a QueryColumnId, not the layer id: a layer id
 * there type-checks nowhere and would mask a real wiring mistake.
 */
export const valueColumnId = uuid<QueryColumn.Id>();

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
