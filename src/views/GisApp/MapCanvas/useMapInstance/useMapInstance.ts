import { useState } from "react";
import { MapInstanceHelpers } from "@/views/GisApp/MapCanvas/useMapInstance/MapInstanceHelpers";
import { useAttachMapInstance } from "@/views/GisApp/MapCanvas/useMapInstance/useAttachMapInstance";
import { useLatestMapValues } from "@/views/GisApp/MapCanvas/useMapInstance/useLatestMapValues";
import { useMapInstanceRefs } from "@/views/GisApp/MapCanvas/useMapInstance/useMapInstanceRefs";
import { useMapWindowResize } from "@/views/GisApp/MapCanvas/useMapInstance/useMapWindowResize";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
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

type UseMapInstanceOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  basemap: AvaMap.Basemap;
  view: AvaMap.ViewState;
  interactiveLayerIds: readonly string[];
  onFeatureClick: (feature: GeoJSON.Feature) => void;
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
}: Readonly<UseMapInstanceOptions>): MapInstance {
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
    emptySpec: MapInstanceHelpers.emptySpec,
    initialView: view,
    instanceRefs,
    latestValues,
    setStyleLoadCount,
  });
  useMapWindowResize(mapRef);

  return _createMapInstanceResult({
    mapRef,
    styleLoadCount,
    isStyleSwapPendingRef,
    appliedSpecRef,
    appliedStyleKeyRef,
  });
}
