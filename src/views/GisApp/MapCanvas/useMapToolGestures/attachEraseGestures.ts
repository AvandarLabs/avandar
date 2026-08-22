import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap } from "maplibre-gl";

import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { clipFreehandByEraser } from "@/views/GisApp/tools/clipFreehandByEraser/clipFreehandByEraser";
import { hitTestAnnotation } from "@/views/GisApp/tools/hitTestAnnotation/hitTestAnnotation";
import { makeFreehandAnnotationFeature } from "@/views/GisApp/tools/makeAnnotationFeatureHelpers";
import { MAP_TOOL_ERASER_RADIUS_PX } from "@/views/GisApp/tools/MapToolGesture.constants";

type EraseCallbacks = {
  onMapToolModeChange: (mode: MapToolMode) => void;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

function _clientToEraser(
  map: MapLibreMap,
  event: PointerEvent,
): { x: number; y: number } {
  const rect = map.getCanvas().getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function _projectVertex(
  map: MapLibreMap,
  vertex: readonly [number, number],
): { x: number; y: number } {
  return map.project({ lng: vertex[0], lat: vertex[1] });
}

function _unprojectPoint(
  map: MapLibreMap,
  point: { x: number; y: number },
): [number, number] {
  const lngLat = map.unproject([point.x, point.y]);
  return [lngLat.lng, lngLat.lat];
}

function _clipFreehandFeature(
  map: MapLibreMap,
  feature: Extract<AvaMapConfig.AnnotationFeature, { kind: "freehand" }>,
  eraser: { x: number; y: number },
): AvaMapConfig.AnnotationFeature[] {
  return clipFreehandByEraser({
    coordinates: feature.geometry.coordinates,
    eraser,
    radiusPx: MAP_TOOL_ERASER_RADIUS_PX,
    project: (vertex) => {
      return _projectVertex(map, vertex);
    },
    unproject: (point) => {
      return _unprojectPoint(map, point);
    },
  }).map((coordinates) => {
    return {
      ...makeFreehandAnnotationFeature(coordinates),
      color: feature.color,
      strokeWidthPx: feature.strokeWidthPx,
    };
  });
}

function _eraseFeatureAt(
  map: MapLibreMap,
  feature: AvaMapConfig.AnnotationFeature,
  eraser: { x: number; y: number },
): AvaMapConfig.AnnotationFeature[] | undefined {
  if (
    !hitTestAnnotation({
      feature,
      eraser,
      radiusPx: MAP_TOOL_ERASER_RADIUS_PX,
      project: (vertex) => {
        return _projectVertex(map, vertex);
      },
    })
  ) {
    return undefined;
  }
  if (feature.kind === "freehand") {
    return _clipFreehandFeature(map, feature, eraser);
  }
  return [];
}

function _applyEraserDab(
  map: MapLibreMap,
  event: PointerEvent,
  callbacks: EraseCallbacks,
): void {
  if (event.altKey) {
    return;
  }
  const eraser = _clientToEraser(map, event);
  callbacks.updateConfig((current) => {
    let nextConfig = current;
    current.annotations.features.forEach((feature) => {
      const replacement = _eraseFeatureAt(map, feature, eraser);
      if (replacement === undefined) {
        return;
      }
      nextConfig = AvaMapConfig.withAnnotationFeaturesReplaced({
        config: nextConfig,
        featureId: feature.id,
        nextFeatures: replacement,
      });
    });
    return nextConfig;
  });
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

/**
 * Erases annotations under a 12px brush: clips freehand, deletes other kinds.
 */
export function attachEraseGestures(
  map: MapLibreMap,
  callbacks: EraseCallbacks,
): () => void {
  const drawing = { isPointerDown: false };
  const canvas = map.getCanvas();
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || event.altKey) {
      return;
    }
    drawing.isPointerDown = true;
    _applyEraserDab(map, event, callbacks);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!drawing.isPointerDown) {
      return;
    }
    _applyEraserDab(map, event, callbacks);
  };
  const onPointerUp = (): void => {
    drawing.isPointerDown = false;
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (_isTypingTarget(event.target) || event.key !== "Escape") {
      return;
    }
    callbacks.onMapToolModeChange({ type: "pan" });
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("keydown", onKeyDown);
  };
}
