import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconPointer } from "@tabler/icons-react";
import { AnnotateMapTool } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateMapTool";
import { AreaMapTool } from "@/views/GisApp/shell/MapToolCluster/AreaMapTool";
import { BufferMapTool } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool";
import { GoToMapTool } from "@/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToMapTool";
import { IsochroneMapTool } from "@/views/GisApp/shell/MapToolCluster/IsochroneMapTool";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import { MeasureMapTool } from "@/views/GisApp/shell/MapToolCluster/MeasureMapTool";
import { PanMapTool } from "@/views/GisApp/shell/MapToolCluster/PanMapTool";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
  selectedLayer?: MapLayer.T;
  onBufferConfirm: (options: {
    distanceMeters: number;
    dissolve: boolean;
  }) => void;
  layers?: readonly MapLayer.T[];
  featureCollections?: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  requestFitBounds: (bounds: MapBounds) => void;
};

/** Renders the ordered map tool buttons and unavailable slots. */
export function MapToolClusterToolbar({
  mapToolMode,
  onMapToolModeChange,
  selectedLayer,
  onBufferConfirm,
  layers,
  featureCollections,
  requestFitBounds,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  return (
    <div
      className={css.mapToolCluster}
      id={GIS_SKIP_TARGET_IDS.toolCluster}
      role="toolbar"
      aria-label={i18n._(msg`Map tools`)}
      tabIndex={-1}
    >
      <PanMapTool
        label={i18n._(msg`Pan and select`)}
        icon={<IconPointer size={17} stroke={1.6} />}
        isPressed={mapToolMode.type === "pan"}
        onClick={() => {
          onMapToolModeChange({ type: "pan" });
        }}
      />
      <span className={css.mapToolClusterSeparator} aria-hidden />
      <AreaMapTool
        mapToolMode={mapToolMode}
        onMapToolModeChange={onMapToolModeChange}
      />
      <MeasureMapTool
        mapToolMode={mapToolMode}
        onMapToolModeChange={onMapToolModeChange}
      />
      <BufferMapTool
        selectedLayer={selectedLayer}
        onBufferConfirm={onBufferConfirm}
      />
      <IsochroneMapTool />
      <AnnotateMapTool
        mapToolMode={mapToolMode}
        onMapToolModeChange={onMapToolModeChange}
      />
      <span className={css.mapToolClusterSeparator} aria-hidden />
      <GoToMapTool
        layers={layers}
        featureCollections={featureCollections}
        requestFitBounds={requestFitBounds}
      />
    </div>
  );
}
