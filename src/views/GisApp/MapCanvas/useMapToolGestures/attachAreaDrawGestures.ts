import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { Dispatch, SetStateAction } from "react";

import { isClosedRingValid } from "@/views/GisApp/tools/isClosedRingValid/isClosedRingValid";
import { isPointerNearVertex } from "@/views/GisApp/tools/isPointerNearVertex/isPointerNearVertex";
import { makeRectangleRing } from "@/views/GisApp/tools/makeRectangleRing/makeRectangleRing";
import {
  MAP_TOOL_DRAG_THRESHOLD_PX,
  MAP_TOOL_SNAP_RADIUS_PX,
} from "@/views/GisApp/tools/MapToolGesture.constants";

type Vertex = [number, number];

export type AreaDrawCallbacks = {
  invalidRingMessage: string;
  onInvalidRing: Dispatch<SetStateAction<string | undefined>>;
  onMapToolModeChange: (mode: MapToolMode) => void;
  setVertices: Dispatch<SetStateAction<Vertex[]>>;
  verticesRef: { current: Vertex[] };
  commitRing: (ring: Vertex[]) => void;
};

type DrawSession =
  | { type: "idle" }
  | { type: "pending"; start: Vertex; startPx: { x: number; y: number } }
  | { type: "rectangle"; start: Vertex; current: Vertex }
  | { type: "lasso"; vertices: Vertex[] }
  | { type: "polygon"; vertices: Vertex[] };

function _lngLatToVertex(lngLat: { lng: number; lat: number }): Vertex {
  return [lngLat.lng, lngLat.lat];
}

function _pointerToVertex(map: MapLibreMap, event: PointerEvent): Vertex {
  const rect = map.getCanvas().getBoundingClientRect();
  const lngLat = map.unproject([
    event.clientX - rect.left,
    event.clientY - rect.top,
  ]);
  return [lngLat.lng, lngLat.lat];
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

function _setPreview(vertices: Vertex[], callbacks: AreaDrawCallbacks): void {
  callbacks.verticesRef.current = vertices;
  callbacks.setVertices(vertices);
}

function _clearSession(
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  session.current = { type: "idle" };
  _setPreview([], callbacks);
  callbacks.onInvalidRing(undefined);
}

function _tryCommit(
  ring: Vertex[],
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  if (!isClosedRingValid(ring)) {
    callbacks.onInvalidRing(callbacks.invalidRingMessage);
    return;
  }
  callbacks.commitRing(ring);
  _clearSession(session, callbacks);
}

function _projectVertex(
  map: MapLibreMap,
  vertex: readonly [number, number],
): { x: number; y: number } {
  return map.project({ lng: vertex[0], lat: vertex[1] });
}

function _onPolygonClick(
  map: MapLibreMap,
  event: MapMouseEvent,
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  if (session.current.type !== "polygon") {
    return;
  }
  const firstVertex = session.current.vertices[0];
  const nextVertex = _lngLatToVertex(event.lngLat);
  if (
    firstVertex &&
    session.current.vertices.length >= 3 &&
    isPointerNearVertex({
      pointer: { x: event.point.x, y: event.point.y },
      vertex: firstVertex,
      project: (vertex) => {
        return _projectVertex(map, vertex);
      },
      radiusPx: MAP_TOOL_SNAP_RADIUS_PX,
    })
  ) {
    _tryCommit(_closeRing(session.current.vertices), session, callbacks);
    return;
  }
  const nextVertices = [...session.current.vertices, nextVertex];
  session.current = { type: "polygon", vertices: nextVertices };
  _setPreview(nextVertices, callbacks);
}

function _onPointerDown(
  map: MapLibreMap,
  event: PointerEvent,
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  if (
    event.button !== 0 ||
    event.altKey ||
    session.current.type === "polygon"
  ) {
    return;
  }
  const vertex = _pointerToVertex(map, event);
  if (event.shiftKey) {
    session.current = { type: "lasso", vertices: [vertex] };
    _setPreview([vertex], callbacks);
    return;
  }
  session.current = {
    type: "pending",
    start: vertex,
    startPx: { x: event.clientX, y: event.clientY },
  };
}

function _onPointerMove(
  map: MapLibreMap,
  event: PointerEvent,
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  const current = session.current;
  if (current.type === "lasso") {
    const nextVertices = [...current.vertices, _pointerToVertex(map, event)];
    session.current = { type: "lasso", vertices: nextVertices };
    _setPreview(nextVertices, callbacks);
    return;
  }
  if (current.type === "pending") {
    const dx = event.clientX - current.startPx.x;
    const dy = event.clientY - current.startPx.y;
    if (Math.hypot(dx, dy) < MAP_TOOL_DRAG_THRESHOLD_PX) {
      return;
    }
    session.current = {
      type: "rectangle",
      start: current.start,
      current: _pointerToVertex(map, event),
    };
  }
  if (session.current.type === "rectangle") {
    const next = _pointerToVertex(map, event);
    session.current = { ...session.current, current: next };
    _setPreview(makeRectangleRing(session.current.start, next), callbacks);
  }
}

function _onPointerUp(
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  const current = session.current;
  if (current.type === "rectangle") {
    _tryCommit(
      makeRectangleRing(current.start, current.current),
      session,
      callbacks,
    );
    return;
  }
  if (current.type === "lasso") {
    _tryCommit(_closeRing(current.vertices), session, callbacks);
    return;
  }
  if (current.type === "pending") {
    session.current = { type: "idle" };
  }
}

function _onDoubleClick(
  event: MapMouseEvent,
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  event.preventDefault();
  if (session.current.type !== "idle" && session.current.type !== "pending") {
    return;
  }
  const vertex = _lngLatToVertex(event.lngLat);
  session.current = { type: "polygon", vertices: [vertex] };
  _setPreview([vertex], callbacks);
}

function _onKeyDown(
  event: KeyboardEvent,
  session: { current: DrawSession },
  callbacks: AreaDrawCallbacks,
): void {
  if (_isTypingTarget(event.target)) {
    return;
  }
  if (event.key === "Escape") {
    if (session.current.type === "idle") {
      callbacks.onMapToolModeChange({ type: "pan" });
      return;
    }
    _clearSession(session, callbacks);
    return;
  }
  if (event.key === "Enter" && session.current.type === "polygon") {
    event.preventDefault();
    _tryCommit(_closeRing(session.current.vertices), session, callbacks);
  }
}

/**
 * Rectangle, lasso, and vertex-polygon drawing for AOI and annotation areas.
 */
export function attachAreaDrawGestures(
  map: MapLibreMap,
  callbacks: AreaDrawCallbacks,
): () => void {
  const session = { current: { type: "idle" } as DrawSession };
  const canvas = map.getCanvas();
  const onPointerDown = (event: PointerEvent): void => {
    _onPointerDown(map, event, session, callbacks);
  };
  const onPointerMove = (event: PointerEvent): void => {
    _onPointerMove(map, event, session, callbacks);
  };
  const onPointerUp = (): void => {
    _onPointerUp(session, callbacks);
  };
  const onClick = (event: MapMouseEvent): void => {
    _onPolygonClick(map, event, session, callbacks);
  };
  const onDoubleClick = (event: MapMouseEvent): void => {
    _onDoubleClick(event, session, callbacks);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    _onKeyDown(event, session, callbacks);
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  map.on("click", onClick);
  map.on("dblclick", onDoubleClick);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    map.off("click", onClick);
    map.off("dblclick", onDoubleClick);
    window.removeEventListener("keydown", onKeyDown);
  };
}
