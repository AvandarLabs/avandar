import maplibregl from "maplibre-gl";
import { applyMapStyles } from "@/views/GisApp/basemap/applyMapStyles";
import { BasemapStyle } from "@/views/GisApp/basemap/BasemapStyle";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { LatestMapValues } from "@/views/GisApp/MapCanvas/useLatestMapValues";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Dispatch, RefObject, SetStateAction } from "react";

const EMPTY_MAP_SPEC: MapSpec = { sources: {}, layers: [] };

/** Mutable state owned by a single MapLibre instance. */
export type MapInstanceRefs = {
  mapRef: RefObject<MapLibreMap | undefined>;
  appliedSpecRef: RefObject<MapSpec>;
  appliedStyleKeyRef: RefObject<string | undefined>;
  isStyleSwapPendingRef: RefObject<boolean>;
};

type StyleLoadHandlerOptions = {
  emptySpec: MapSpec;
  instanceRefs: MapInstanceRefs;
  latestValues: LatestMapValues;
  map: MapLibreMap;
  setStyleLoadCount: Dispatch<SetStateAction<number>>;
};

type AttachMapInstanceOptions = Omit<StyleLoadHandlerOptions, "map"> & {
  basemap: AvaMap.Basemap;
  container: HTMLDivElement;
  view: AvaMap.ViewState;
};

/** Creates a MapLibre map with the controls used by the GIS canvas. */
function _createMapLibreInstance({
  basemap,
  container,
  view,
}: Readonly<{
  basemap: AvaMap.Basemap;
  container: HTMLDivElement;
  view: AvaMap.ViewState;
}>): MapLibreMap {
  const map = new maplibregl.Map({
    container,
    style: BasemapStyle.fromBasemap(basemap),
    center: view.center,
    zoom: view.zoom,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(
    new maplibregl.ScaleControl({ unit: "metric" }),
    "bottom-right",
  );
  return map;
}

/** Creates the single map-level click handler used by every rendered layer. */
function _createMapClickHandler(
  options: Readonly<{
    map: MapLibreMap;
    latestValues: LatestMapValues;
  }>,
): (event: maplibregl.MapMouseEvent) => void {
  return (event) => {
    const layerIds = options.latestValues.interactiveLayerIdsRef.current.filter(
      (layerId) => {
        return options.map.getLayer(layerId);
      },
    );
    if (layerIds.length === 0) {
      return;
    }
    const [feature] = options.map.queryRenderedFeatures(event.point, {
      layers: layerIds,
    });
    if (feature) {
      options.latestValues.onFeatureClickRef.current(
        feature as GeoJSON.Feature,
      );
    }
  };
}

/** Creates the handler that resets sync state after a style loads. */
function _createStyleLoadHandler({
  emptySpec,
  instanceRefs,
  latestValues,
  map,
  setStyleLoadCount,
}: Readonly<StyleLoadHandlerOptions>): () => void {
  return () => {
    instanceRefs.appliedSpecRef.current = emptySpec;
    instanceRefs.isStyleSwapPendingRef.current = false;
    const basemap = latestValues.basemapRef.current;
    if (basemap.type === "builtIn" && basemap.style === "avandar") {
      applyMapStyles(map);
    }
    setStyleLoadCount((currentCount) => {
      return currentCount + 1;
    });
  };
}

/** Creates, wires, and returns cleanup for one MapLibre instance. */
function _attachMapInstance({
  basemap,
  container,
  emptySpec,
  instanceRefs,
  latestValues,
  setStyleLoadCount,
  view,
}: Readonly<AttachMapInstanceOptions>): () => void {
  const map = _createMapLibreInstance({ basemap, container, view });
  instanceRefs.mapRef.current = map;
  instanceRefs.appliedStyleKeyRef.current = BasemapStyle.toKey(basemap);
  const onMapClick = _createMapClickHandler({ map, latestValues });
  const onStyleLoad = _createStyleLoadHandler({
    emptySpec,
    instanceRefs,
    latestValues,
    map,
    setStyleLoadCount,
  });
  map.on("click", onMapClick);
  map.on("style.load", onStyleLoad);
  return () => {
    map.off("click", onMapClick);
    map.off("style.load", onStyleLoad);
    map.remove();
    instanceRefs.mapRef.current = undefined;
    instanceRefs.appliedSpecRef.current = emptySpec;
    instanceRefs.appliedStyleKeyRef.current = undefined;
    instanceRefs.isStyleSwapPendingRef.current = false;
    setStyleLoadCount(0);
  };
}

/** Lifecycle helpers for constructing and wiring a MapLibre instance. */
export const MapInstanceHelpers = {
  /** The baseline applied before any map sources or layers are synchronized. */
  emptySpec: EMPTY_MAP_SPEC,

  /** Creates, wires, and returns cleanup for one MapLibre instance. */
  attach: _attachMapInstance,
} satisfies {
  emptySpec: MapSpec;
  attach: typeof _attachMapInstance;
};
