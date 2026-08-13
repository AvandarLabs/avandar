import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { BasemapStyle } from "@/views/GisApp/basemap/BasemapStyle";
import { applyMapStyles } from "@/views/GisApp/basemap/applyMapStyles";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { RefObject } from "react";

/** The baseline a freshly loaded style starts from: nothing applied yet. */
export const EMPTY_MAP_SPEC: MapSpec = { sources: {}, layers: [] };

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
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  basemap: AvaMap.Basemap;
  view: AvaMap.ViewState;
  interactiveLayerIds: readonly string[];
  onFeatureClick: (feature: GeoJSON.Feature) => void;
}): MapInstance {
  const mapRef = useRef<MapLibreMap | undefined>(undefined);
  const appliedSpecRef = useRef<MapSpec>(EMPTY_MAP_SPEC);
  const appliedStyleKeyRef = useRef<string | undefined>(undefined);
  const isStyleSwapPendingRef = useRef(false);
  const [styleLoadCount, setStyleLoadCount] = useState(0);

  // Latest-value refs, declared before the one-shot construction effect that
  // reads them, so its handlers stay current without re-registering.
  const interactiveLayerIdsRef = useRef(interactiveLayerIds);
  const onFeatureClickRef = useRef(onFeatureClick);
  const basemapRef = useRef(basemap);
  // `view` is an initial-value-only prop: it seeds the camera at construction
  // and is deliberately not synced afterwards, so the user's pan and zoom are
  // never yanked back by a re-render.
  const viewRef = useRef(view);
  useEffect(function syncLatestValueRefs() {
    interactiveLayerIdsRef.current = interactiveLayerIds;
    onFeatureClickRef.current = onFeatureClick;
    basemapRef.current = basemap;
  }, [interactiveLayerIds, onFeatureClick, basemap]);

  useEffect(function constructMapInstance() {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return undefined;
    }
    const initialBasemap = basemapRef.current;
    const initialView = viewRef.current;
    const map = new maplibregl.Map({
      container,
      style: BasemapStyle.fromBasemap(initialBasemap),
      center: initialView.center,
      zoom: initialView.zoom,
    });
    appliedStyleKeyRef.current = BasemapStyle.toKey(initialBasemap);
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-right",
    );
    mapRef.current = map;

    // One map-level click handler covers every layer, present or future, so
    // adding and removing layers cannot accumulate listeners.
    const onMapClick = (event: maplibregl.MapMouseEvent): void => {
      const existingLayerIds = interactiveLayerIdsRef.current.filter(
        (layerId) => {
          return map.getLayer(layerId);
        },
      );
      if (existingLayerIds.length === 0) {
        return;
      }
      const [feature] = map.queryRenderedFeatures(event.point, {
        layers: existingLayerIds,
      });
      if (feature) {
        onFeatureClickRef.current(feature as GeoJSON.Feature);
      }
    };
    map.on("click", onMapClick);

    const onStyleLoad = (): void => {
      // A style swap discards sources and layers, so the next sync must start
      // from an empty baseline.
      appliedSpecRef.current = EMPTY_MAP_SPEC;
      isStyleSwapPendingRef.current = false;
      const currentBasemap = basemapRef.current;
      if (
        currentBasemap.type === "builtIn" &&
        currentBasemap.style === "avandar"
      ) {
        applyMapStyles(map);
      }
      setStyleLoadCount((current) => {
        return current + 1;
      });
    };
    map.on("style.load", onStyleLoad);

    return () => {
      map.off("click", onMapClick);
      map.off("style.load", onStyleLoad);
      map.remove();
      mapRef.current = undefined;
      appliedSpecRef.current = EMPTY_MAP_SPEC;
      appliedStyleKeyRef.current = undefined;
      isStyleSwapPendingRef.current = false;
      setStyleLoadCount(0);
    };
    // Construction is intentionally one-shot: later prop changes are applied
    // by the sync hooks rather than by rebuilding the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(function resizeMapWithWindow() {
    const onWindowResize = (): void => {
      mapRef.current?.resize();
    };
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  return {
    mapRef,
    styleLoadCount,
    isStyleSwapPendingRef,
    appliedSpecRef,
    appliedStyleKeyRef,
  };
}
