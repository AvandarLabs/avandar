import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { Dispatch, SetStateAction } from "react";

import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { attachAreaDrawGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/attachAreaDrawGestures";
import { isClosedRingValid } from "@/views/GisApp/tools/isClosedRingValid/isClosedRingValid";
import { isPointerNearVertex } from "@/views/GisApp/tools/isPointerNearVertex/isPointerNearVertex";
import { MAP_TOOL_SNAP_RADIUS_PX } from "@/views/GisApp/tools/MapToolGesture.constants";

type Vertex = [number, number];

/** Click, close, and Escape callbacks shared by AOI drawing. */
export type AoiGestureCallbacks = {
  invalidRingMessage: string;
  onInvalidRing: Dispatch<SetStateAction<string | undefined>>;
  onMapToolModeChange: (mode: MapToolMode) => void;
  setVertices: Dispatch<SetStateAction<Vertex[]>>;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  verticesRef: { current: Vertex[] };
};

/** Click, close, and Escape callbacks shared by geodesic measure. */
export type MeasureGestureCallbacks = {
  onMapToolModeChange: (mode: MapToolMode) => void;
  setVertices: Dispatch<SetStateAction<Vertex[]>>;
  verticesRef: { current: Vertex[] };
};

function _lngLatToVertex(lngLat: { lng: number; lat: number }): Vertex {
  return [lngLat.lng, lngLat.lat];
}

function _closeRing(vertices: readonly Vertex[]): Vertex[] {
  const firstVertex = vertices[0];
  if (!firstVertex) {
    return [];
  }
  const lastVertex = vertices[vertices.length - 1];
  if (
    lastVertex &&
    lastVertex[0] === firstVertex[0] &&
    lastVertex[1] === firstVertex[1]
  ) {
    return [...vertices];
  }
  return [...vertices, firstVertex];
}

function _dropDuplicateCloseVertex(vertices: readonly Vertex[]): Vertex[] {
  if (vertices.length < 2) {
    return [...vertices];
  }
  const lastVertex = vertices[vertices.length - 1];
  const previousVertex = vertices[vertices.length - 2];
  if (
    lastVertex &&
    previousVertex &&
    lastVertex[0] === previousVertex[0] &&
    lastVertex[1] === previousVertex[1]
  ) {
    return vertices.slice(0, -1);
  }
  return [...vertices];
}

function _commitAoiRing(ring: Vertex[], callbacks: AoiGestureCallbacks): void {
  callbacks.updateConfig((current) => {
    return AvaMapConfig.withAoi({
      config: current,
      aoi: { type: "Polygon", coordinates: [ring] },
    });
  });
}

function _closeMeasureRing(callbacks: MeasureGestureCallbacks): void {
  const ring = _closeRing(
    _dropDuplicateCloseVertex(callbacks.verticesRef.current),
  );
  if (!isClosedRingValid(ring)) {
    return;
  }
  callbacks.verticesRef.current = ring;
  callbacks.setVertices(ring);
}

function _isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function _shouldSnapCloseMeasure(
  map: MapLibreMap,
  event: MapMouseEvent,
  vertices: readonly Vertex[],
): boolean {
  const firstVertex = vertices[0];
  if (!firstVertex || vertices.length < 3) {
    return false;
  }
  return isPointerNearVertex({
    pointer: { x: event.point.x, y: event.point.y },
    vertex: firstVertex,
    project: (vertex) => {
      return map.project({ lng: vertex[0], lat: vertex[1] });
    },
    radiusPx: MAP_TOOL_SNAP_RADIUS_PX,
  });
}

function _appendVertexFromClick(
  map: MapLibreMap,
  event: MapMouseEvent,
  callbacks: MeasureGestureCallbacks,
): void {
  if (isClosedRingValid(callbacks.verticesRef.current)) {
    return;
  }
  if (_shouldSnapCloseMeasure(map, event, callbacks.verticesRef.current)) {
    _closeMeasureRing(callbacks);
    return;
  }
  const nextVertices = [
    ...callbacks.verticesRef.current,
    _lngLatToVertex(event.lngLat),
  ];
  callbacks.verticesRef.current = nextVertices;
  callbacks.setVertices(nextVertices);
}

/**
 * Registers AOI drawing: rectangle drag, Shift-lasso, or vertex polygon.
 */
export function attachAoiGestures(
  map: MapLibreMap,
  callbacks: AoiGestureCallbacks,
): () => void {
  return attachAreaDrawGestures(map, {
    invalidRingMessage: callbacks.invalidRingMessage,
    onInvalidRing: callbacks.onInvalidRing,
    onMapToolModeChange: callbacks.onMapToolModeChange,
    setVertices: callbacks.setVertices,
    verticesRef: callbacks.verticesRef,
    commitRing: (ring) => {
      _commitAoiRing(ring, callbacks);
    },
  });
}

/**
 * Registers geodesic measure drawing: click to add vertices, snap-to-first
 * or Enter to close a ring.
 */
export function attachMeasureGestures(
  map: MapLibreMap,
  callbacks: MeasureGestureCallbacks,
): () => void {
  map.doubleClickZoom.disable();
  const onClick = (event: MapMouseEvent): void => {
    _appendVertexFromClick(map, event, callbacks);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (_isTypingTarget(event.target)) {
      return;
    }
    if (event.key === "Escape") {
      callbacks.onMapToolModeChange({ type: "pan" });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      _closeMeasureRing(callbacks);
    }
  };
  map.on("click", onClick);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    map.off("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    map.doubleClickZoom.enable();
  };
}
