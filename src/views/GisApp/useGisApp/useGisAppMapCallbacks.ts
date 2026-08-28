import { useCallback } from "react";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import { useFeatureInspector } from "@/views/GisApp/useFeatureInspector";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";

type MapCallbackOptions = Readonly<{
  editor: ReturnType<typeof useAvaMapEditor>;
  expandPanel: (panel: "inspector") => void;
  featureInspector: ReturnType<typeof useFeatureInspector>;
  mapConfig: AvaMapConfig.T;
  setSelectedLayerId: (layerId: MapLayer.Id | undefined) => void;
  setIsAnnotationRowSelected: (isSelected: boolean) => void;
  setSelectedAnnotationFeatureId: (
    featureId: AvaMapConfig.AnnotationFeatureId | undefined,
  ) => void;
}>;

/** Map canvas callbacks that update the model and selection. */
export type GisAppMapCallbacks = {
  onMapFeatureClick: (
    feature: GeoJSON.Feature,
    renderedLayerId: string,
  ) => void;
  onMapClusterClick: (cluster: ClusterSelection) => void;
  onMapViewChange: (view: AvaMapConfig.ViewState) => void;
};

function _isAnnotationRenderedLayer(renderedLayerId: string): boolean {
  return (
    renderedLayerId === MapLayerIds.annotationFillLayer ||
    renderedLayerId === MapLayerIds.annotationLineLayer ||
    renderedLayerId === MapLayerIds.annotationSymbolLayer
  );
}

function _selectAnnotationFromClick(
  options: MapCallbackOptions,
  feature: GeoJSON.Feature,
): void {
  const featureId = feature.properties?.id;
  if (typeof featureId !== "string") {
    return;
  }
  options.setSelectedAnnotationFeatureId(
    featureId as AvaMapConfig.AnnotationFeatureId,
  );
  options.setIsAnnotationRowSelected(true);
  options.setSelectedLayerId(undefined);
  options.expandPanel("inspector");
}

function _selectLayerFromClick(
  options: MapCallbackOptions,
  feature: GeoJSON.Feature,
  renderedLayerId: string,
): void {
  const layer = options.mapConfig.layers.find((candidate) => {
    return MapLayerIds.toLayerId(candidate.id) === renderedLayerId;
  });
  if (!layer) {
    return;
  }
  options.setIsAnnotationRowSelected(false);
  options.setSelectedAnnotationFeatureId(undefined);
  options.setSelectedLayerId(layer.id);
  options.featureInspector.onFeatureClick(feature);
}

function _selectLayerFromCluster(
  options: MapCallbackOptions,
  cluster: ClusterSelection,
): void {
  const layer = options.mapConfig.layers.find((candidate) => {
    return MapLayerIds.toLayerId(candidate.id) === cluster.layerId;
  });
  if (!layer) {
    return;
  }
  options.setIsAnnotationRowSelected(false);
  options.setSelectedAnnotationFeatureId(undefined);
  options.setSelectedLayerId(layer.id);
  options.featureInspector.onClusterClick(cluster);
}

/** Updates the model and selection in response to map canvas interactions. */
export function useGisAppMapCallbacks(
  options: MapCallbackOptions,
): GisAppMapCallbacks {
  const onMapViewChange = useCallback(
    (view: AvaMapConfig.ViewState) => {
      options.editor.updateConfig((current) => {
        return { ...current, view };
      });
    },
    [options.editor],
  );
  const onMapFeatureClick = useCallback(
    (feature: GeoJSON.Feature, renderedLayerId: string) => {
      if (_isAnnotationRenderedLayer(renderedLayerId)) {
        _selectAnnotationFromClick(options, feature);
        return;
      }
      _selectLayerFromClick(options, feature, renderedLayerId);
    },
    [options],
  );
  const onMapClusterClick = useCallback(
    (cluster: ClusterSelection) => {
      _selectLayerFromCluster(options, cluster);
    },
    [options],
  );

  return { onMapFeatureClick, onMapClusterClick, onMapViewChange };
}
