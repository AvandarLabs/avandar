import { propEq } from "@avandar/utils";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { useState } from "react";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dispatch, SetStateAction } from "react";

/** Selected layer or annotation row for the current map config. */
export type GisAppLayerSelection = {
  rows: ReturnType<typeof AvaMapConfig.toStackOrder>;
  selectedLayer: MapLayer.T | undefined;
  selectedLayerId: MapLayer.Id | undefined;
  setSelectedLayerId: Dispatch<SetStateAction<MapLayer.Id | undefined>>;
  isAnnotationRowSelected: boolean;
  setIsAnnotationRowSelected: Dispatch<SetStateAction<boolean>>;
  selectedAnnotationFeatureId: AvaMapConfig.AnnotationFeatureId | undefined;
  setSelectedAnnotationFeatureId: Dispatch<
    SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
  >;
  selectedAnnotationFeature: AvaMapConfig.AnnotationFeature | undefined;
};

/** Keeps the selected layer or annotation row valid for the current config. */
export function useGisAppLayerSelection(
  mapConfig: AvaMapConfig.T,
): GisAppLayerSelection {
  const [selectedLayerId, setSelectedLayerId] = useState<
    MapLayer.Id | undefined
  >(mapConfig.layers[mapConfig.layers.length - 1]?.id);
  const [isAnnotationRowSelected, setIsAnnotationRowSelected] = useState(false);
  const [selectedAnnotationFeatureId, setSelectedAnnotationFeatureId] =
    useState<AvaMapConfig.AnnotationFeatureId | undefined>();
  const rows = AvaMapConfig.toStackOrder(mapConfig);
  const selectedLayer =
    selectedLayerId && !isAnnotationRowSelected ?
      mapConfig.layers.find(propEq("id", selectedLayerId))
    : undefined;
  const selectedAnnotationFeature =
    selectedAnnotationFeatureId ?
      mapConfig.annotations.features.find(
        propEq("id", selectedAnnotationFeatureId),
      )
    : undefined;

  return {
    rows,
    selectedLayer,
    selectedLayerId: isAnnotationRowSelected ? undefined : selectedLayerId,
    setSelectedLayerId,
    isAnnotationRowSelected,
    setIsAnnotationRowSelected,
    selectedAnnotationFeatureId,
    setSelectedAnnotationFeatureId,
    selectedAnnotationFeature,
  };
}
