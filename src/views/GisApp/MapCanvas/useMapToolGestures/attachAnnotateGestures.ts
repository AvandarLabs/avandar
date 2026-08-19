import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { match } from "ts-pattern";
import { isClosedRingValid } from "@/views/GisApp/tools/isClosedRingValid/isClosedRingValid";
import {
  makeAreaAnnotationFeature,
  makeArrowAnnotationFeature,
  makeFreehandAnnotationFeature,
  makeTextAnnotationFeature,
} from "@/views/GisApp/tools/makeAnnotationFeatureHelpers";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { Dispatch, SetStateAction } from "react";

type Vertex = [number, number];

export type AnnotateGestureCallbacks = {
  invalidRingMessage: string;
  onInvalidRing: Dispatch<SetStateAction<string | undefined>>;
  onMapToolModeChange: (mode: MapToolMode) => void;
  setLastCreatedAnnotationId: Dispatch<
    SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
  >;
  setVertices: Dispatch<SetStateAction<Vertex[]>>;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  verticesRef: { current: Vertex[] };
};

function _lngLatToVertex(lngLat: { lng: number; lat: number }): Vertex {
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

function _clearVertices(callbacks: AnnotateGestureCallbacks): void {
  callbacks.verticesRef.current = [];
  callbacks.setVertices([]);
  callbacks.onInvalidRing(undefined);
}

function _commitFeature(
  feature: AvaMapConfig.AnnotationFeature,
  callbacks: AnnotateGestureCallbacks,
): void {
  callbacks.updateConfig((current) => {
    return AvaMapConfig.withAnnotationFeature({ config: current, feature });
  });
  callbacks.setLastCreatedAnnotationId(feature.id);
  _clearVertices(callbacks);
}

function _appendVertex(
  event: MapMouseEvent,
  callbacks: AnnotateGestureCallbacks,
): Vertex[] {
  const nextVertices = [
    ...callbacks.verticesRef.current,
    _lngLatToVertex(event.lngLat),
  ];
  callbacks.verticesRef.current = nextVertices;
  callbacks.setVertices(nextVertices);
  return nextVertices;
}

function _commitClosedArea(callbacks: AnnotateGestureCallbacks): void {
  const ring = _closeRing(
    _dropDuplicateCloseVertex(callbacks.verticesRef.current),
  );
  if (!isClosedRingValid(ring)) {
    callbacks.onInvalidRing(callbacks.invalidRingMessage);
    return;
  }
  _commitFeature(makeAreaAnnotationFeature(ring), callbacks);
}

function _onAnnotateEscape(callbacks: AnnotateGestureCallbacks): void {
  callbacks.onMapToolModeChange({ type: "pan" });
}

function _attachEscapeAndCleanup(
  _map: MapLibreMap,
  callbacks: AnnotateGestureCallbacks,
  detachMap: () => void,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (_isTypingTarget(event.target)) {
      return;
    }
    if (event.key === "Escape") {
      _onAnnotateEscape(callbacks);
    }
  };
  window.addEventListener("keydown", onKeyDown);
  return () => {
    detachMap();
    window.removeEventListener("keydown", onKeyDown);
  };
}

function _attachTextGestures(
  map: MapLibreMap,
  callbacks: AnnotateGestureCallbacks,
): () => void {
  const onClick = (event: MapMouseEvent): void => {
    _commitFeature(
      makeTextAnnotationFeature(_lngLatToVertex(event.lngLat)),
      callbacks,
    );
  };
  map.on("click", onClick);
  return _attachEscapeAndCleanup(map, callbacks, () => {
    map.off("click", onClick);
  });
}

function _attachArrowGestures(
  map: MapLibreMap,
  callbacks: AnnotateGestureCallbacks,
): () => void {
  const onClick = (event: MapMouseEvent): void => {
    const nextVertices = _appendVertex(event, callbacks);
    const start = nextVertices[0];
    const end = nextVertices[1];
    if (!start || !end) {
      return;
    }
    _commitFeature(makeArrowAnnotationFeature(start, end), callbacks);
  };
  map.on("click", onClick);
  return _attachEscapeAndCleanup(map, callbacks, () => {
    map.off("click", onClick);
  });
}

function _pointerEventToVertex(map: MapLibreMap, event: PointerEvent): Vertex {
  const rect = map.getCanvas().getBoundingClientRect();
  const lngLat = map.unproject([
    event.clientX - rect.left,
    event.clientY - rect.top,
  ]);
  return [lngLat.lng, lngLat.lat];
}

function _appendPointerVertex(
  map: MapLibreMap,
  event: PointerEvent,
  callbacks: AnnotateGestureCallbacks,
): Vertex[] {
  const nextVertices = [
    ...callbacks.verticesRef.current,
    _pointerEventToVertex(map, event),
  ];
  callbacks.verticesRef.current = nextVertices;
  callbacks.setVertices(nextVertices);
  return nextVertices;
}

function _finishFreehandStroke(
  map: MapLibreMap,
  drawing: { isPointerDown: boolean },
  callbacks: AnnotateGestureCallbacks,
): void {
  if (!drawing.isPointerDown) {
    return;
  }
  drawing.isPointerDown = false;
  map.dragPan.enable();
  const vertices = callbacks.verticesRef.current;
  if (vertices.length < 2) {
    _clearVertices(callbacks);
    return;
  }
  _commitFeature(makeFreehandAnnotationFeature(vertices), callbacks);
}

function _cancelFreehandStroke(
  map: MapLibreMap,
  drawing: { isPointerDown: boolean },
  callbacks: AnnotateGestureCallbacks,
): void {
  if (!drawing.isPointerDown) {
    return;
  }
  drawing.isPointerDown = false;
  map.dragPan.enable();
  _clearVertices(callbacks);
}

function _attachFreehandGestures(
  map: MapLibreMap,
  callbacks: AnnotateGestureCallbacks,
): () => void {
  const drawing = { isPointerDown: false };
  const canvas = map.getCanvas();
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    drawing.isPointerDown = true;
    map.dragPan.disable();
    _clearVertices(callbacks);
    _appendPointerVertex(map, event, callbacks);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!drawing.isPointerDown) {
      return;
    }
    _appendPointerVertex(map, event, callbacks);
  };
  const onPointerUp = (): void => {
    _finishFreehandStroke(map, drawing, callbacks);
  };
  const onPointerCancel = (): void => {
    _cancelFreehandStroke(map, drawing, callbacks);
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  return _attachEscapeAndCleanup(map, callbacks, () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    map.dragPan.enable();
  });
}

function _attachAreaGestures(
  map: MapLibreMap,
  callbacks: AnnotateGestureCallbacks,
): () => void {
  map.doubleClickZoom.disable();
  const onClick = (event: MapMouseEvent): void => {
    callbacks.onInvalidRing(undefined);
    _appendVertex(event, callbacks);
  };
  const onDoubleClick = (event: MapMouseEvent): void => {
    event.preventDefault();
    _commitClosedArea(callbacks);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (_isTypingTarget(event.target)) {
      return;
    }
    if (event.key === "Escape") {
      _onAnnotateEscape(callbacks);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      _commitClosedArea(callbacks);
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
 * Registers text, arrow, freehand, and area annotation drawing on the map.
 */
export function attachAnnotateGestures(
  map: MapLibreMap,
  kind: Extract<MapToolMode, { type: "annotate" }>["kind"],
  callbacks: AnnotateGestureCallbacks,
): () => void {
  return match(kind)
    .with("text", () => {
      return _attachTextGestures(map, callbacks);
    })
    .with("arrow", () => {
      return _attachArrowGestures(map, callbacks);
    })
    .with("freehand", () => {
      return _attachFreehandGestures(map, callbacks);
    })
    .with("area", () => {
      return _attachAreaGestures(map, callbacks);
    })
    .exhaustive();
}
