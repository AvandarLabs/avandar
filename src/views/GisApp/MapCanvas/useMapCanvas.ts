import { noop } from "@avandar/utils";
import { useRef } from "react";
import { FitMapBounds } from "@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds";
import { useMapChromeOverlays } from "@/views/GisApp/MapCanvas/useMapChromeOverlays";
import { useMapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import { useMapSpecSync } from "@/views/GisApp/MapCanvas/useMapSpecSync";
import { useMapStyleSync } from "@/views/GisApp/MapCanvas/useMapStyleSync";
import { useMapToolGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures";
import { useMapViewSync } from "@/views/GisApp/MapCanvas/useMapViewSync/useMapViewSync";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { FitBoundsRequest } from "@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds";
import type {
  MapClusterClickHandler,
  MapFeatureClickHandler,
} from "@/views/GisApp/MapCanvas/useLatestMapValues";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { RefObject } from "react";

/** Inputs used to synchronize map configuration with the live map canvas. */
export type MapCanvasOptions = {
  basemap: AvaMapConfig.Basemap;

  /** Seeds the camera at construction; later changes are not applied. */
  view: AvaMapConfig.ViewState;

  spec: MapSpec;

  /** Camera request to apply, or `undefined` to leave the camera alone. */
  fitBoundsRequest: FitBoundsRequest | undefined;

  /** Ids of layers whose features respond to clicks. */
  interactiveLayerIds: readonly string[];
  onFeatureClick: MapFeatureClickHandler;
  onClusterClick?: MapClusterClickHandler;

  /** Persists camera changes caused outside config synchronization. */
  onViewChange?: (view: AvaMapConfig.ViewState) => void;

  /** Active map tool; non-pan modes skip feature hit-testing. */
  mapToolMode?: MapToolMode;

  /** Updates the active map tool, typically back to Pan on Escape. */
  onMapToolModeChange?: (mode: MapToolMode) => void;

  /** Committed AOI polygon drawn as dashed canvas chrome. */
  aoi?: AvaMapConfig.AoiPolygon;

  /** Writes a closed Area ring into map config. */
  updateConfig?: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** References owned by the live map canvas controller. */
export type MapCanvasController = {
  containerRef: RefObject<HTMLDivElement | null>;
  mapInstance: MapInstance;
  invalidRingStatus: string | undefined;
  measureVertices: ReadonlyArray<[number, number]>;
  lastCreatedAnnotationId: AvaMapConfig.AnnotationFeatureId | undefined;
};

type CanvasToolOverlayOptions = {
  mapInstance: MapInstance;
  spec: MapSpec;
  aoi: AvaMapConfig.AoiPolygon | undefined;
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

function useMapCanvasToolOverlays(options: CanvasToolOverlayOptions): {
  invalidRingStatus: string | undefined;
  measureVertices: ReadonlyArray<[number, number]>;
  lastCreatedAnnotationId: AvaMapConfig.AnnotationFeatureId | undefined;
} {
  const {
    inProgressVertices,
    annotationPreviewVertices = [],
    measureVertices = [],
    invalidRingStatus,
    lastCreatedAnnotationId,
  } = useMapToolGestures({
    mapRef: options.mapInstance.mapRef,
    mapToolMode: options.mapToolMode,
    onMapToolModeChange: options.onMapToolModeChange,
    updateConfig: options.updateConfig,
  });
  useMapChromeOverlays({
    mapInstance: options.mapInstance,
    spec: options.spec,
    aoi: options.aoi,
    inProgressVertices,
    annotationPreviewVertices,
    measureVertices,
  });
  return { invalidRingStatus, measureVertices, lastCreatedAnnotationId };
}

/** Owns the live map controller so nearby siblings can consume it directly. */
export function useMapCanvas({
  basemap,
  view,
  spec,
  fitBoundsRequest,
  interactiveLayerIds,
  onFeatureClick,
  onClusterClick = noop,
  onViewChange = noop,
  mapToolMode = { type: "pan" },
  onMapToolModeChange = noop,
  aoi,
  updateConfig = noop,
}: Readonly<MapCanvasOptions>): MapCanvasController {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useMapInstance({
    containerRef,
    basemap,
    view,
    interactiveLayerIds,
    onFeatureClick,
    onClusterClick,
    mapToolMode,
  });
  const { invalidRingStatus, measureVertices, lastCreatedAnnotationId } =
    useMapCanvasToolOverlays({
      mapInstance,
      spec,
      aoi,
      mapToolMode,
      onMapToolModeChange,
      updateConfig,
    });
  useMapStyleSync({ mapInstance, basemap });
  useMapSpecSync({ mapInstance, spec });
  FitMapBounds.useFitMapBounds({ mapInstance, request: fitBoundsRequest });
  useMapViewSync({ mapInstance, view, onViewChange });
  return {
    containerRef,
    mapInstance,
    invalidRingStatus,
    measureVertices,
    lastCreatedAnnotationId,
  };
}
