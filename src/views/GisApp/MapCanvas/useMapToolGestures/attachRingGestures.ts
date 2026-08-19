import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { isClosedRingValid } from "@/views/GisApp/tools/isClosedRingValid/isClosedRingValid";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { Dispatch, SetStateAction } from "react";

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

function _clearInProgressVertices(callbacks: AoiGestureCallbacks): void {
  callbacks.verticesRef.current = [];
  callbacks.setVertices([]);
  callbacks.onInvalidRing(undefined);
}

function _commitClosedRing(
  vertices: readonly Vertex[],
  callbacks: AoiGestureCallbacks,
): void {
  const ring = _closeRing(vertices);
  if (!isClosedRingValid(ring)) {
    callbacks.onInvalidRing(callbacks.invalidRingMessage);
    return;
  }
  callbacks.updateConfig((current) => {
    return AvaMapConfig.withAoi({
      config: current,
      aoi: { type: "Polygon", coordinates: [ring] },
    });
  });
  _clearInProgressVertices(callbacks);
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

function _appendVertexFromClick(
  event: MapMouseEvent,
  callbacks: MeasureGestureCallbacks,
): void {
  if (isClosedRingValid(callbacks.verticesRef.current)) {
    return;
  }
  callbacks.setVertices((current) => {
    const nextVertices = [...current, _lngLatToVertex(event.lngLat)];
    callbacks.verticesRef.current = nextVertices;
    return nextVertices;
  });
}

/**
 * Registers AOI polygon drawing: click to add vertices, Enter or double-click
 * to close.
 */
export function attachAoiGestures(
  map: MapLibreMap,
  callbacks: AoiGestureCallbacks,
): () => void {
  map.doubleClickZoom.disable();
  const onClick = (event: MapMouseEvent): void => {
    callbacks.onInvalidRing(undefined);
    callbacks.setVertices((current) => {
      const nextVertices = [...current, _lngLatToVertex(event.lngLat)];
      callbacks.verticesRef.current = nextVertices;
      return nextVertices;
    });
  };
  const onDoubleClick = (event: MapMouseEvent): void => {
    event.preventDefault();
    _commitClosedRing(
      _dropDuplicateCloseVertex(callbacks.verticesRef.current),
      callbacks,
    );
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
      _commitClosedRing(callbacks.verticesRef.current, callbacks);
    }
  };
  map.on("click", onClick);
  map.on("dblclick", onDoubleClick);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    map.off("click", onClick);
    map.off("dblclick", onDoubleClick);
    window.removeEventListener("keydown", onKeyDown);
    map.doubleClickZoom.enable();
  };
}

/**
 * Registers geodesic measure drawing: click to add vertices, Enter or
 * double-click to close a ring.
 */
export function attachMeasureGestures(
  map: MapLibreMap,
  callbacks: MeasureGestureCallbacks,
): () => void {
  map.doubleClickZoom.disable();
  const onClick = (event: MapMouseEvent): void => {
    _appendVertexFromClick(event, callbacks);
  };
  const onDoubleClick = (event: MapMouseEvent): void => {
    event.preventDefault();
    _closeMeasureRing(callbacks);
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
  map.on("dblclick", onDoubleClick);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    map.off("click", onClick);
    map.off("dblclick", onDoubleClick);
    window.removeEventListener("keydown", onKeyDown);
    map.doubleClickZoom.enable();
  };
}
