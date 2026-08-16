import maplibregl from "maplibre-gl";
import { applyMapStyles } from "@/views/GisApp/basemap/applyMapStyles";
import { BasemapStyle } from "@/views/GisApp/basemap/BasemapStyle";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { LatestMapValues } from "@/views/GisApp/MapCanvas/useLatestMapValues";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Dispatch, RefObject, SetStateAction } from "react";

/** The baseline a freshly loaded style starts from: nothing applied yet. */
export const EMPTY_MAP_SPEC: MapSpec = { sources: {}, layers: [] };

/** Mutable state owned by a single MapLibre instance. */
export type MapInstanceRefs = {
  mapRef: RefObject<MapLibreMap | undefined>;
  appliedSpecRef: RefObject<MapSpec>;
  appliedStyleKeyRef: RefObject<string | undefined>;
  isStyleSwapPendingRef: RefObject<boolean>;
};

type CreateStyleLoadHandlerInput = {
  emptySpec: MapSpec;
  instanceRefs: MapInstanceRefs;
  latestValues: LatestMapValues;
  map: MapLibreMap;
  setStyleLoadCount: Dispatch<SetStateAction<number>>;
};

/** Inputs required to attach one MapLibre instance to the canvas. */
export type AttachMapInstanceInput = Omit<
  CreateStyleLoadHandlerInput,
  "map"
> & {
  basemap: AvaMapConfig.Basemap;
  container: HTMLDivElement;
  view: AvaMapConfig.ViewState;
};

/** Creates a MapLibre map with the controls used by the GIS canvas. */
function _createMapLibreInstance({
  basemap,
  container,
  view,
}: Readonly<{
  basemap: AvaMapConfig.Basemap;
  container: HTMLDivElement;
  view: AvaMapConfig.ViewState;
}>): MapLibreMap {
  const map = new maplibregl.Map({
    attributionControl: false,
    container,
    style: BasemapStyle.fromBasemap(basemap),
    center: view.center,
    zoom: view.zoom,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  return map;
}

/** Returns whether a rendered feature represents a MapLibre point cluster. */
function _isClusterFeature(feature: GeoJSON.Feature): boolean {
  const properties = feature.properties;
  if (!properties) {
    return false;
  }
  return "cluster_id" in properties || "point_count" in properties;
}

/** Zooms the map into one cluster instead of opening the feature inspector. */
function _expandClusterOnClick(
  map: MapLibreMap,
  feature: maplibregl.MapGeoJSONFeature,
): void {
  const clusterId = feature.properties?.cluster_id;
  if (typeof clusterId !== "number") {
    return;
  }
  const source = map.getSource<maplibregl.GeoJSONSource>(feature.source);
  if (!source || !("getClusterExpansionZoom" in source)) {
    return;
  }
  void source.getClusterExpansionZoom(clusterId).then((zoom) => {
    const { geometry } = feature;
    if (geometry.type !== "Point") {
      return;
    }
    map.easeTo({
      center: geometry.coordinates as [number, number],
      zoom,
    });
  });
}

/** Creates the single map-level click handler used by every rendered layer. */
function _createMapClickHandler(
  options: Readonly<{
    map: MapLibreMap;
    latestValues: LatestMapValues;
  }>,
): (event: maplibregl.MapMouseEvent) => void {
  const { map, latestValues } = options;
  return (event) => {
    const layerIds = latestValues.interactiveLayerIdsRef.current.filter(
      (layerId) => {
        return map.getLayer(layerId);
      },
    );
    if (layerIds.length === 0) {
      return;
    }
    const [feature] = map.queryRenderedFeatures(event.point, {
      layers: layerIds,
    });
    if (!feature) {
      return;
    }
    if (_isClusterFeature(feature)) {
      _expandClusterOnClick(map, feature);
      return;
    }
    latestValues.onFeatureClickRef.current(
      feature as GeoJSON.Feature,
      feature.layer.id,
    );
  };
}

/** Publishes the live map to the development-only E2E inspection hook. */
function _attachE2EMapInspectionHook(map: MapLibreMap): void {
  if (import.meta.env.DEV) {
    window.__avandarE2EMap = map;
  }
}

/** Removes this map from the development-only E2E inspection hook. */
function _detachE2EMapInspectionHook(map: MapLibreMap): void {
  if (import.meta.env.DEV && window.__avandarE2EMap === map) {
    delete window.__avandarE2EMap;
  }
}

/** Creates the handler that resets sync state after a style loads. */
function _createStyleLoadHandler({
  emptySpec,
  instanceRefs,
  latestValues,
  map,
  setStyleLoadCount,
}: CreateStyleLoadHandlerInput): () => void {
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

function _attachMapInstance({
  basemap,
  container,
  emptySpec,
  instanceRefs,
  latestValues,
  setStyleLoadCount,
  view,
}: AttachMapInstanceInput): () => void {
  const map = _createMapLibreInstance({ basemap, container, view });
  instanceRefs.mapRef.current = map;
  _attachE2EMapInspectionHook(map);
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
    _detachE2EMapInspectionHook(map);
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
  /** Creates, wires, and returns cleanup for one MapLibre instance. */
  attach: _attachMapInstance,
};
