import { useEffect, useState } from "react";
import { mapToolCursor } from "@/views/GisApp/tools/mapToolCursor/mapToolCursor";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { RefObject } from "react";

type Options = {
  mapRef: RefObject<MapLibreMap | undefined>;
  mapToolMode: MapToolMode;
};

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

function _syncMapPan(
  map: MapLibreMap,
  mapToolMode: MapToolMode,
  isAltPanHeld: boolean,
  isPointerDown: boolean,
): void {
  const canPan = mapToolMode.type === "pan" || isAltPanHeld;
  if (canPan) {
    map.dragPan.enable();
  } else {
    map.dragPan.disable();
  }
  if (mapToolMode.type === "pan") {
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
  } else {
    map.doubleClickZoom.disable();
    // Shift-drag draws a lasso on the drawing tools, so the built-in
    // shift-drag zoom box must not fire alongside it.
    map.boxZoom.disable();
  }
  map.getCanvas().style.cursor = mapToolCursor({
    mapToolMode,
    isAltPanHeld,
    isPointerDown,
  });
}

/**
 * Enables MapLibre drag-pan only for Select or while Alt is held, keeps
 * double-click and box zoom out of the drawing tools, and sets the canvas
 * cursor to match the armed tool.
 */
export function useMapPanPolicy({ mapRef, mapToolMode }: Options): void {
  const [isAltPanHeld, setIsAltPanHeld] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  useEffect(
    function syncPanAndCursor() {
      const map = mapRef.current;
      if (!map) {
        return;
      }
      _syncMapPan(map, mapToolMode, isAltPanHeld, isPointerDown);
    },
    [isAltPanHeld, isPointerDown, mapRef, mapToolMode],
  );
  useEffect(
    function bindAltPanKeys() {
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== "Alt" || _isTypingTarget(event.target)) {
          return;
        }
        setIsAltPanHeld(true);
      };
      const onKeyUp = (event: KeyboardEvent): void => {
        if (event.key === "Alt") {
          setIsAltPanHeld(false);
        }
      };
      const onBlur = (): void => {
        setIsAltPanHeld(false);
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", onBlur);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("blur", onBlur);
      };
    },
    [],
  );
  useEffect(
    function bindPointerDownCursor() {
      const canvas = mapRef.current?.getCanvas();
      if (!canvas) {
        return undefined;
      }
      const onPointerDown = (): void => {
        setIsPointerDown(true);
      };
      const onPointerUp = (): void => {
        setIsPointerDown(false);
      };
      canvas.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      return () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointerup", onPointerUp);
      };
    },
    [mapRef, mapToolMode],
  );
}
