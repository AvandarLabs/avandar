import { useEffect, useRef } from "react";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MutableRefObject, RefObject } from "react";

type MapViewSyncMap = {
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  jumpTo: (options: { center: [number, number]; zoom: number }) => unknown;
  on: (eventName: "moveend", handler: () => void) => unknown;
  off: (eventName: "moveend", handler: () => void) => unknown;
};

type MapViewSyncInstance = {
  mapRef: RefObject<MapViewSyncMap | null | undefined>;
};

/** Maximum camera-coordinate drift treated as the same persisted view. */
const VIEW_EPSILON = 0.000_000_1;

function _areViewsEqual(
  options: Readonly<{
    first: AvaMapConfig.ViewState;
    second: AvaMapConfig.ViewState;
  }>,
): boolean {
  const { first, second } = options;
  return (
    Math.abs(first.center[0] - second.center[0]) < VIEW_EPSILON &&
    Math.abs(first.center[1] - second.center[1]) < VIEW_EPSILON &&
    Math.abs(first.zoom - second.zoom) < VIEW_EPSILON
  );
}

function _getMapView(
  mapInstance: MapViewSyncInstance,
): AvaMapConfig.ViewState | undefined {
  const map = mapInstance.mapRef.current;
  if (!map) {
    return undefined;
  }
  const center = map.getCenter();
  return { center: [center.lng, center.lat], zoom: map.getZoom() };
}

/** Subscribes to user-driven camera changes and returns the cleanup. */
function _subscribeToMapCameraChanges(
  options: Readonly<{
    mapInstance: MapViewSyncInstance;
    pendingConfigViewRef: MutableRefObject<AvaMapConfig.ViewState | undefined>;
    onViewChange: (view: AvaMapConfig.ViewState) => void;
  }>,
): (() => void) | undefined {
  const { mapInstance, pendingConfigViewRef, onViewChange } = options;
  const map = mapInstance.mapRef.current;
  if (!map) {
    return undefined;
  }
  const onMoveEnd = (): void => {
    const mapView = _getMapView(mapInstance);
    if (!mapView) {
      return;
    }
    const pendingConfigView = pendingConfigViewRef.current;
    pendingConfigViewRef.current = undefined;
    if (
      pendingConfigView &&
      _areViewsEqual({ first: mapView, second: pendingConfigView })
    ) {
      return;
    }
    onViewChange(mapView);
  };
  map.on("moveend", onMoveEnd);
  return () => {
    map.off("moveend", onMoveEnd);
  };
}

/** Keeps the persisted camera and MapLibre camera synchronized both ways. */
export function useMapViewSync({
  mapInstance,
  view,
  onViewChange,
}: Readonly<{
  mapInstance: MapViewSyncInstance;
  view: AvaMapConfig.ViewState;
  onViewChange: (view: AvaMapConfig.ViewState) => void;
}>): void {
  const pendingConfigViewRef = useRef<AvaMapConfig.ViewState | undefined>(
    undefined,
  );

  useEffect(
    function publishMapCameraChanges() {
      return _subscribeToMapCameraChanges({
        mapInstance,
        pendingConfigViewRef,
        onViewChange,
      });
    },
    [mapInstance, onViewChange],
  );

  useEffect(
    function applyPersistedMapCamera() {
      const map = mapInstance.mapRef.current;
      const mapView = _getMapView(mapInstance);
      if (
        !map ||
        !mapView ||
        _areViewsEqual({ first: mapView, second: view })
      ) {
        return;
      }
      pendingConfigViewRef.current = view;
      map.jumpTo({ center: view.center, zoom: view.zoom });
    },
    [mapInstance, view],
  );
}
