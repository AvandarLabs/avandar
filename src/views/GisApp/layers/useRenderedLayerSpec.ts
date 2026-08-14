import { propEq } from "@avandar/utils";
import { useMemo } from "react";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getLayerStatsFromFeatureCollection } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Memoizes the declarative MapLibre spec for one layer and its GeoJSON. */
export function useRenderedLayerSpec({
  featureCollection,
  layer,
}: {
  featureCollection: GeoJSON.FeatureCollection;
  layer: MapLayer.T;
}): MapSpec {
  const { queryColumns } = layer.source;
  const valueColumn =
    layer.symbology.type === "proportionalSymbol" ?
      queryColumns.find(propEq("id", layer.symbology.value))
    : undefined;
  const valueColumnName =
    valueColumn ? QueryColumn.getDerivedColumnName(valueColumn) : undefined;
  return useMemo(() => {
    return makeMapSpecFromLayerSpecs([
      makeLayerSpecFromMapLayer({
        layer,
        featureCollection,
        stats: getLayerStatsFromFeatureCollection({
          featureCollection,
          valueColumnName,
        }),
        valueColumnName,
      }),
    ]);
  }, [layer, featureCollection, valueColumnName]);
}
