import { noop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { MapToolClusterToolbar } from "@/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar";
import { MeasureReadout } from "@/views/GisApp/shell/MapToolCluster/MeasureReadout";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type {
  BufferConfirmOptions,
  FilterByBufferOptions,
} from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
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

  /** Opens a layer's feature list, after the buffer tool filters it. */
  onOpenFeatureList?: (layerId: MapLayer.Id) => void;

  /** Drives the Add a place tool; omitted where the map cannot hold places. */
  placeTool?: PlaceToolController;
};

const EMPTY_MEASURE_VERTICES: ReadonlyArray<[number, number]> = [];

/** Inserts the confirmed buffer under a fresh id and returns that id. */
function useBufferConfirmHandler(
  selectedLayer: MapLayer.T | undefined,
  updateConfig: Props["updateConfig"],
): (options: BufferConfirmOptions) => MapLayer.Id | undefined {
  const { t } = useLingui();
  return (options) => {
    if (!selectedLayer || !updateConfig) {
      return undefined;
    }
    const sourceName = selectedLayer.name;
    const name = t`Buffer of ${sourceName}`;
    const bufferLayerId = uuid<MapLayer.Id>();
    updateConfig((current) => {
      return AvaMapConfig.withBufferLayerInserted({
        config: current,
        sourceLayerId: selectedLayer.id,
        ...options,
        name,
        bufferLayerId,
      });
    });
    return bufferLayerId;
  };
}

/** Filters the chosen point layer by the new buffer and opens its list. */
function _filterLayerByBuffer(
  options: Readonly<
    FilterByBufferOptions & {
      updateConfig: Props["updateConfig"];
      onOpenFeatureList: (layerId: MapLayer.Id) => void;
    }
  >,
): void {
  options.updateConfig?.((current) => {
    return AvaMapConfig.withLayerReplaced({
      config: current,
      layerId: options.targetLayerId,
      update: (layer) => {
        return MapLayerUpdates.withSpatialFilter({
          layer,
          spatialFilterLayerId: options.bufferLayerId,
        });
      },
    });
  });
  options.onOpenFeatureList(options.targetLayerId);
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
  onOpenFeatureList = noop,
  placeTool,
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
        onFilterByBuffer={(filter) => {
          _filterLayerByBuffer({ ...filter, updateConfig, onOpenFeatureList });
        }}
        layers={layers}
        featureCollections={featureCollections}
        requestFitBounds={requestFitBounds}
        placeTool={placeTool}
      />
    </>
  );
}
