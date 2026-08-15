import { noop } from "@avandar/utils";
import { useRef } from "react";
import { FitMapBounds } from "@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds";
import { useMapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import { useMapSpecSync } from "@/views/GisApp/MapCanvas/useMapSpecSync";
import { useMapStyleSync } from "@/views/GisApp/MapCanvas/useMapStyleSync";
import { useMapViewSync } from "@/views/GisApp/MapCanvas/useMapViewSync/useMapViewSync";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { FitBoundsRequest } from "@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds";
import type { MapFeatureClickHandler } from "@/views/GisApp/MapCanvas/useLatestMapValues";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
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

  /** Persists camera changes caused outside config synchronization. */
  onViewChange?: (view: AvaMapConfig.ViewState) => void;
};

/** References owned by the live map canvas controller. */
export type MapCanvasController = {
  containerRef: RefObject<HTMLDivElement | null>;
  mapInstance: MapInstance;
};

/** Owns the live map controller so nearby siblings can consume it directly. */
export function useMapCanvas({
  basemap,
  view,
  spec,
  fitBoundsRequest,
  interactiveLayerIds,
  onFeatureClick,
  onViewChange = noop,
}: Readonly<MapCanvasOptions>): MapCanvasController {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useMapInstance({
    containerRef,
    basemap,
    view,
    interactiveLayerIds,
    onFeatureClick,
  });
  useMapStyleSync({ mapInstance, basemap });
  useMapSpecSync({ mapInstance, spec });
  FitMapBounds.useFitMapBounds({ mapInstance, request: fitBoundsRequest });
  useMapViewSync({ mapInstance, view, onViewChange });
  return { containerRef, mapInstance };
}
