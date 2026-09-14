import maplibregl from "maplibre-gl";
import { applyMapStyles } from "@/views/GisApp/basemap/applyMapStyles";
import { BasemapStyle } from "@/views/GisApp/basemap/BasemapStyle";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { LatestMapValues } from "@/views/GisApp/MapCanvas/useLatestMapValues";
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

/** Identifies the cluster and source a table-opening click came from. */
export type ClusterSelection = {
  sourceId: string;
  clusterId: number;
  pointCount: number;
  coordinates: [number, number];
  layerId: string;
};

/**
 * Returns whether a rendered feature stands for more than one source row.
 *
 * A DuckDB-aggregated cell carries `point_count` even when it holds a single
 * row, so the count is compared rather than merely looked for: treating such
 * a cell as a group would leave its click doing nothing, since it has no
 * cluster to expand and no group of rows to list.
 */
function _isClusterFeature(feature: GeoJSON.Feature): boolean {
  const properties = feature.properties;
  if (!properties) {
    return false;
  }
  if ("cluster_id" in properties) {
    return true;
  }
  const pointCount = properties.point_count;
  return typeof pointCount === "number" && pointCount > 1;
}

/** Builds the cluster identity carried by a clicked cluster feature. */
function _makeClusterSelectionFromFeature(
  feature: maplibregl.MapGeoJSONFeature,
): ClusterSelection | undefined {
  const clusterId = feature.properties?.cluster_id;
  const pointCount = feature.properties?.point_count;
  if (typeof clusterId !== "number" || typeof pointCount !== "number") {
    return undefined;
  }
  const { geometry } = feature;
  if (geometry.type !== "Point") {
    return undefined;
  }
  return {
    sourceId: feature.source,
    clusterId,
    pointCount,
    coordinates: geometry.coordinates as [number, number],
    layerId: feature.layer.id,
  };
}

/**
 * Eases the camera to the zoom level where a cluster's points expand.
 *
 * Returns the underlying request as a promise, rather than firing it and
 * forgetting it, so a caller behind a user-facing control (the table's
 * "Zoom to cluster" button) can catch a rejection and tell the user rather
 * than let it disappear silently.
 */
function _zoomToCluster(
  map: MapLibreMap,
  cluster: Readonly<
    Pick<ClusterSelection, "clusterId" | "coordinates" | "sourceId">
  >,
): Promise<void> {
  const source = map.getSource<maplibregl.GeoJSONSource>(cluster.sourceId);
  if (!source || !("getClusterExpansionZoom" in source)) {
    return Promise.resolve();
  }
  return source.getClusterExpansionZoom(cluster.clusterId).then((zoom) => {
    map.easeTo({ center: cluster.coordinates, zoom });
  });
}

/**
 * How many zoom levels a click on a DuckDB-aggregated cell moves in.
 *
 * A cell is not a MapLibre cluster, so there is no expansion zoom to ask
 * for: the grid is rebuilt from SQL at the new zoom, and each step of the
 * grid is one zoom level, so two levels reliably splits the clicked cell.
 */
const AGGREGATED_CELL_ZOOM_STEP = 2;

/**
 * Zooms toward a DuckDB-aggregated cell so its rows separate.
 *
 * A cell carries a count but no `cluster_id`, so MapLibre cannot expand it
 * and the browser does not hold its rows to list. Zooming rebuilds the grid
 * finer at the new zoom, which is the only way to see inside the cell, and it
 * keeps the click from doing nothing at all.
 */
function _zoomToAggregatedCell(
  map: MapLibreMap,
  coordinates: [number, number],
): void {
  map.easeTo({
    center: coordinates,
    zoom: map.getZoom() + AGGREGATED_CELL_ZOOM_STEP,
  });
}

/**
 * The point geometry of a clicked group that MapLibre did not cluster.
 *
 * Returns `undefined` for a MapLibre cluster, which has its own expansion
 * path, and for a feature standing for a single row, which opens a popup.
 */
function _getAggregatedCellCoordinates(
  feature: maplibregl.MapGeoJSONFeature,
): [number, number] | undefined {
  const pointCount = feature.properties?.point_count;
  if (
    typeof feature.properties?.cluster_id === "number" ||
    typeof pointCount !== "number" ||
    pointCount <= 1 ||
    feature.geometry.type !== "Point"
  ) {
    return undefined;
  }
  return feature.geometry.coordinates as [number, number];
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
    if (latestValues.mapToolModeRef.current.type !== "pan") {
      return;
    }
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
    const aggregatedCellCoordinates = _getAggregatedCellCoordinates(feature);
    if (aggregatedCellCoordinates) {
      _zoomToAggregatedCell(map, aggregatedCellCoordinates);
      return;
    }
    if (_isClusterFeature(feature)) {
      const cluster = _makeClusterSelectionFromFeature(feature);
      if (cluster) {
        latestValues.onClusterClickRef.current(cluster);
      }
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

  /**
   * Eases the camera to a cluster's expansion zoom. Shared by the map's
   * click handling and the "Zoom to cluster" action in the feature table.
   */
  zoomToCluster: _zoomToCluster,
};
