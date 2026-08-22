import type { Map as MapLibreMap } from "maplibre-gl";

import {
  MAP_TOOL_TEXT_SIZE_MAX_PX,
  MAP_TOOL_TEXT_SIZE_MIN_PX,
} from "@/views/GisApp/tools/MapToolGesture.constants";

export type TextOverlayDrag =
  | { type: "idle" }
  | {
      type: "move";
      startClient: { x: number; y: number };
      startLngLat: [number, number];
    }
  | { type: "resize"; startClientY: number; startSizePx: number };

function _clientToLngLat(
  map: MapLibreMap,
  clientX: number,
  clientY: number,
): [number, number] {
  const rect = map.getCanvas().getBoundingClientRect();
  const lngLat = map.unproject([clientX - rect.left, clientY - rect.top]);
  return [lngLat.lng, lngLat.lat];
}

/** Clamps annotation text size to the allowed pixel band. */
export function clampTextSizePx(sizePx: number): number {
  return Math.min(
    MAP_TOOL_TEXT_SIZE_MAX_PX,
    Math.max(MAP_TOOL_TEXT_SIZE_MIN_PX, sizePx),
  );
}

/** Starts a move drag from the current pointer, disabling map pan. */
export function beginTextMoveDrag(
  map: MapLibreMap,
  event: PointerEvent,
  startLngLat: [number, number],
): Extract<TextOverlayDrag, { type: "move" }> {
  map.dragPan.disable();
  return {
    type: "move",
    startClient: { x: event.clientX, y: event.clientY },
    startLngLat,
  };
}

/** Starts a resize drag from the current pointer, disabling map pan. */
export function beginTextResizeDrag(
  map: MapLibreMap,
  event: PointerEvent,
  startSizePx: number,
): Extract<TextOverlayDrag, { type: "resize" }> {
  map.dragPan.disable();
  return {
    type: "resize",
    startClientY: event.clientY,
    startSizePx,
  };
}

/** Applies an in-progress text overlay drag to move or resize callbacks. */
export function applyTextOverlayDrag(
  map: MapLibreMap,
  event: PointerEvent,
  drag: TextOverlayDrag,
  onMove: (coordinates: [number, number]) => void,
  onResize: (sizePx: number) => void,
): void {
  if (drag.type === "move") {
    const [lng, lat] = _clientToLngLat(map, event.clientX, event.clientY);
    const start = _clientToLngLat(map, drag.startClient.x, drag.startClient.y);
    onMove([
      drag.startLngLat[0] + (lng - start[0]),
      drag.startLngLat[1] + (lat - start[1]),
    ]);
    return;
  }
  if (drag.type === "resize") {
    onResize(
      clampTextSizePx(drag.startSizePx + (event.clientY - drag.startClientY)),
    );
  }
}

/** Re-enables Select pan after a text overlay drag ends. */
export function endTextOverlayDrag(map: MapLibreMap): TextOverlayDrag {
  map.dragPan.enable();
  return { type: "idle" };
}
