import { useMemo, useState } from "react";
import { EMPTY_MAP_SPEC } from "@/views/GisApp/MapCanvas/MapInstanceHelpers";
import { useAttachMapInstance } from "@/views/GisApp/MapCanvas/useAttachMapInstance";
import { useLatestMapValues } from "@/views/GisApp/MapCanvas/useLatestMapValues";
import { useMapInstanceRefs } from "@/views/GisApp/MapCanvas/useMapInstanceRefs";
import { useMapWindowResize } from "@/views/GisApp/MapCanvas/useMapWindowResize";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapFeatureClickHandler } from "@/views/GisApp/MapCanvas/useLatestMapValues";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { RefObject } from "react";

/** The live MapLibre instance plus the state the sync hooks need to read. */
export type MapInstance = {
  mapRef: RefObject<MapLibreMap | undefined>;

  /**
   * Increments on every completed `style.load`. Sync effects depend on it so
   * they re-run once a new style is ready, rather than against a style that is
   * still loading.
   */
  styleLoadCount: number;

  /** True between a `setStyle` call and the `style.load` it triggers. */
  isStyleSwapPendingRef: RefObject<boolean>;

  /** The spec last applied to the current style. */
  appliedSpecRef: RefObject<MapSpec>;

  /** Identity of the style currently applied, to skip redundant swaps. */
  appliedStyleKeyRef: RefObject<string | undefined>;
};

type UseMapInstanceInput = {
  containerRef: RefObject<HTMLDivElement | null>;
  basemap: AvaMapConfig.Basemap;
  view: AvaMapConfig.ViewState;
  interactiveLayerIds: readonly string[];
  onFeatureClick: MapFeatureClickHandler;
};

/** Presents the mutable refs and style counter as the hook's public result. */
function _createMapInstanceResult({
  appliedSpecRef,
  appliedStyleKeyRef,
  isStyleSwapPendingRef,
  mapRef,
  styleLoadCount,
}: MapInstance): MapInstance {
  return {
    mapRef,
    styleLoadCount,
    isStyleSwapPendingRef,
    appliedSpecRef,
    appliedStyleKeyRef,
  };
}

/**
 * Constructs the MapLibre instance exactly once and keeps it alive for the
 * canvas's lifetime.
 *
 * Style changes are applied in place by {@link useMapStyleSync}, so the
 * instance survives them rather than being rebuilt.
 */
export function useMapInstance({
  containerRef,
  basemap,
  view,
  interactiveLayerIds,
  onFeatureClick,
}: UseMapInstanceInput): MapInstance {
  const instanceRefs = useMapInstanceRefs();
  const { mapRef, appliedSpecRef, appliedStyleKeyRef, isStyleSwapPendingRef } =
    instanceRefs;
  const [styleLoadCount, setStyleLoadCount] = useState(0);

  const latestValues = useLatestMapValues({
    basemap,
    interactiveLayerIds,
    onFeatureClick,
  });
  useAttachMapInstance({
    containerRef,
    emptySpec: EMPTY_MAP_SPEC,
    initialView: view,
    instanceRefs,
    latestValues,
    setStyleLoadCount,
  });
  useMapWindowResize(mapRef);

  return useMemo(() => {
    return _createMapInstanceResult({
      mapRef,
      styleLoadCount,
      isStyleSwapPendingRef,
      appliedSpecRef,
      appliedStyleKeyRef,
    });
  }, [
    appliedSpecRef,
    appliedStyleKeyRef,
    isStyleSwapPendingRef,
    mapRef,
    styleLoadCount,
  ]);
}
