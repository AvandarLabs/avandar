import { noop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapToolClusterToolbar } from "@/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar";
import { MeasureReadout } from "@/views/GisApp/shell/MapToolCluster/MeasureReadout";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
  selectedLayer?: MapLayer.T;
  updateConfig?: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  measureVertices?: ReadonlyArray<[number, number]>;
  layers?: readonly MapLayer.T[];
  featureCollections?: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  requestFitBounds?: (bounds: MapBounds) => void;
};

const EMPTY_MEASURE_VERTICES: ReadonlyArray<[number, number]> = [];

function _insertBufferLayer(options: {
  selectedLayer: MapLayer.T | undefined;
  updateConfig: Props["updateConfig"];
  name: string;
  distanceMeters: number;
  dissolve: boolean;
}): void {
  const { selectedLayer, updateConfig, name, distanceMeters, dissolve } =
    options;
  if (!selectedLayer || !updateConfig) {
    return;
  }
  updateConfig((current) => {
    return AvaMapConfig.withBufferLayerInserted({
      config: current,
      sourceLayerId: selectedLayer.id,
      distanceMeters,
      dissolve,
      name,
    });
  });
}

function useBufferConfirmHandler(
  selectedLayer: MapLayer.T | undefined,
  updateConfig: Props["updateConfig"],
): (options: { distanceMeters: number; dissolve: boolean }) => void {
  const { t } = useLingui();
  return ({ distanceMeters, dissolve }) => {
    if (!selectedLayer) {
      return;
    }
    const sourceName = selectedLayer.name;
    _insertBufferLayer({
      selectedLayer,
      updateConfig,
      name: t`Buffer of ${sourceName}`,
      distanceMeters,
      dissolve,
    });
  };
}

/** Renders the stable toolbar layout and its available tool states. */
export function MapToolCluster({
  mapToolMode,
  onMapToolModeChange,
  selectedLayer,
  updateConfig,
  measureVertices = EMPTY_MEASURE_VERTICES,
  layers,
  featureCollections,
  requestFitBounds = noop,
}: Readonly<Props>): ReactNode {
  const onBufferConfirm = useBufferConfirmHandler(selectedLayer, updateConfig);
  return (
    <>
      <MeasureReadout vertices={measureVertices} />
      <MapToolClusterToolbar
        mapToolMode={mapToolMode}
        onMapToolModeChange={onMapToolModeChange}
        selectedLayer={selectedLayer}
        onBufferConfirm={onBufferConfirm}
        layers={layers}
        featureCollections={featureCollections}
        requestFitBounds={requestFitBounds}
      />
    </>
  );
}
