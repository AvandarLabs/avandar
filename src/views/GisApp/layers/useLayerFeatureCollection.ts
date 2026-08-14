import { useMemo } from "react";
import { makeFeatureCollectionFromRows } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/** Memoizes the GeoJSON conversion for one layer's current query rows. */
export function useLayerFeatureCollection({
  binding,
  layerId,
  queryResult,
  sensitivity,
}: {
  binding: MapLayer.GeoBindingColumnNames | undefined;
  layerId: string;
  queryResult: QueryResult.T<UnknownRow> | undefined;
  sensitivity: MapLayer.Sensitivity;
}): {
  featureCollection: GeoJSON.FeatureCollection;
  drops: readonly GeometryDropReport[];
} {
  return useMemo(() => {
    if (!binding || !queryResult) {
      return { featureCollection: EMPTY_FEATURE_COLLECTION, drops: [] };
    }
    return makeFeatureCollectionFromRows({
      rows: queryResult.data,
      binding,
      sensitivity,
      layerId,
    });
  }, [binding, queryResult, sensitivity, layerId]);
}
