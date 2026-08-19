import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { match } from "ts-pattern";
import { attachAreaDrawGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/attachAreaDrawGestures";
import { MAP_TOOL_DRAG_THRESHOLD_PX } from "@/views/GisApp/tools/MapToolGesture.constants";
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
  onEditingTextFeatureIdChange: (
    featureId: AvaMapConfig.AnnotationFeatureId | undefined,
  ) => void;
  onInvalidRing: Dispatch<SetStateAction<string | undefined>>;
  onMapToolModeChange: (mode: MapToolMode) => void;
  setLastCreatedAnnotationId: Dispatch<
    SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
  >;
  setVertices: Dispatch<SetStateAction<Vertex[]>>;
  textPlaceholder: string;
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
    const feature = makeTextAnnotationFeature(
      _lngLatToVertex(event.lngLat),
      callbacks.textPlaceholder,
    );
    _commitFeature(feature, callbacks);
    callbacks.onEditingTextFeatureIdChange(feature.id);
    callbacks.onMapToolModeChange({ type: "pan" });
  };
  map.on("click", onClick);
  return _attachEscapeAndCleanup(map, callbacks, () => {
    map.off("click", onClick);
  });
}

type ArrowStroke = {
  didDrag: boolean;
  isPointerDown: boolean;
  start: Vertex | undefined;
  startPx: { x: number; y: number } | undefined;
};

function _previewVertices(
  vertices: Vertex[],
  callbacks: AnnotateGestureCallbacks,
): void {
  callbacks.verticesRef.current = vertices;
  callbacks.setVertices(vertices);
}

function _beginArrowStroke(
  map: MapLibreMap,
  event: PointerEvent,
  stroke: ArrowStroke,
  callbacks: AnnotateGestureCallbacks,
): void {
  if (event.button !== 0 || event.altKey) {
    return;
  }
  const start = _pointerEventToVertex(map, event);
  stroke.isPointerDown = true;
  stroke.didDrag = false;
  stroke.start = start;
  stroke.startPx = { x: event.clientX, y: event.clientY };
  _clearVertices(callbacks);
  _previewVertices([start], callbacks);
}

function _updateArrowStroke(
  map: MapLibreMap,
  event: PointerEvent,
  stroke: ArrowStroke,
  callbacks: AnnotateGestureCallbacks,
): void {
  if (!stroke.isPointerDown || !stroke.start || !stroke.startPx) {
    return;
  }
  const dx = event.clientX - stroke.startPx.x;
  const dy = event.clientY - stroke.startPx.y;
  if (!stroke.didDrag && Math.hypot(dx, dy) < MAP_TOOL_DRAG_THRESHOLD_PX) {
    return;
  }
  stroke.didDrag = true;
  const end = _pointerEventToVertex(map, event);
  _previewVertices([stroke.start, end], callbacks);
}

function _finishArrowStroke(
  stroke: ArrowStroke,
  callbacks: AnnotateGestureCallbacks,
): void {
  if (!stroke.isPointerDown) {
    return;
  }
  stroke.isPointerDown = false;
  const start = stroke.start;
  const end = callbacks.verticesRef.current[1];
  if (!stroke.didDrag || !start || !end) {
    _clearVertices(callbacks);
    return;
  }
  _commitFeature(makeArrowAnnotationFeature(start, end), callbacks);
}

function _cancelArrowStroke(
  stroke: ArrowStroke,
  callbacks: AnnotateGestureCallbacks,
): void {
  if (!stroke.isPointerDown) {
    return;
  }
  stroke.isPointerDown = false;
  _clearVertices(callbacks);
}

function _attachArrowGestures(
  map: MapLibreMap,
  callbacks: AnnotateGestureCallbacks,
): () => void {
  const stroke: ArrowStroke = {
    didDrag: false,
    isPointerDown: false,
    start: undefined,
    startPx: undefined,
  };
  const canvas = map.getCanvas();
  const onPointerDown = (event: PointerEvent): void => {
    _beginArrowStroke(map, event, stroke, callbacks);
  };
  const onPointerMove = (event: PointerEvent): void => {
    _updateArrowStroke(map, event, stroke, callbacks);
  };
  const onPointerUp = (): void => {
    _finishArrowStroke(stroke, callbacks);
  };
  const onPointerCancel = (): void => {
    _cancelArrowStroke(stroke, callbacks);
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
  drawing: { isPointerDown: boolean },
  callbacks: AnnotateGestureCallbacks,
): void {
  if (!drawing.isPointerDown) {
    return;
  }
  drawing.isPointerDown = false;
  const vertices = callbacks.verticesRef.current;
  if (vertices.length < 2) {
    _clearVertices(callbacks);
    return;
  }
  _commitFeature(makeFreehandAnnotationFeature(vertices), callbacks);
}

function _cancelFreehandStroke(
  drawing: { isPointerDown: boolean },
  callbacks: AnnotateGestureCallbacks,
): void {
  if (!drawing.isPointerDown) {
    return;
  }
  drawing.isPointerDown = false;
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
    _finishFreehandStroke(drawing, callbacks);
  };
  const onPointerCancel = (): void => {
    _cancelFreehandStroke(drawing, callbacks);
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
  });
}

function _attachAreaGestures(
  map: MapLibreMap,
  callbacks: AnnotateGestureCallbacks,
): () => void {
  return attachAreaDrawGestures(map, {
    invalidRingMessage: callbacks.invalidRingMessage,
    onInvalidRing: callbacks.onInvalidRing,
    onMapToolModeChange: callbacks.onMapToolModeChange,
    setVertices: callbacks.setVertices,
    verticesRef: callbacks.verticesRef,
    commitRing: (ring) => {
      _commitFeature(makeAreaAnnotationFeature(ring), callbacks);
    },
  });
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
