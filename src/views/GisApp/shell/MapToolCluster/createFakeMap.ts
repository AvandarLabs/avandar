/**
 * Shared map-tool fake for MapToolCluster and annotation gesture tests.
 */
import { vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";

type MapPointerHandler = (event: {
  lngLat: { lng: number; lat: number };
  originalEvent?: MouseEvent | PointerEvent;
  point: { x: number; y: number };
  preventDefault: () => void;
}) => void;

type PointerOptions = {
  shiftKey?: boolean;
  altKey?: boolean;
};

function _emitDomPointer(
  target: EventTarget,
  type: string,
  lng: number,
  lat: number,
  options: PointerOptions = {},
): void {
  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: type === "pointermove" || type === "pointerdown" ? 1 : 0,
      clientX: lng,
      clientY: lat,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
    }),
  );
}

export function createFakeMap(): {
  map: MapLibreMap;
  dragPan: {
    disable: ReturnType<typeof vi.fn>;
    enable: ReturnType<typeof vi.fn>;
  };
  emitClick: (lng: number, lat: number) => void;
  emitDblClick: (lng: number, lat: number) => void;
  emitPointerDown: (lng: number, lat: number, options?: PointerOptions) => void;
} {
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () => {
    return {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      toJSON: () => {
        return {};
      },
    };
  };
  document.body.append(canvas);
  const handlers: Record<string, MapPointerHandler | undefined> = {};
  const dragPan = { disable: vi.fn(), enable: vi.fn() };
  const map = {
    on: (eventName: string, handler: MapPointerHandler) => {
      handlers[eventName] = handler;
    },
    off: vi.fn(),
    boxZoom: { disable: vi.fn(), enable: vi.fn() },
    doubleClickZoom: { disable: vi.fn(), enable: vi.fn() },
    dragPan,
    getCanvas: () => {
      return canvas;
    },
    unproject: (point: [number, number] | { x: number; y: number }) => {
      if (Array.isArray(point)) {
        return { lng: point[0], lat: point[1] };
      }
      return { lng: point.x, lat: point.y };
    },
    project: (lngLat: { lng: number; lat: number } | [number, number]) => {
      if (Array.isArray(lngLat)) {
        return { x: lngLat[0], y: lngLat[1] };
      }
      return { x: lngLat.lng, y: lngLat.lat };
    },
  };
  const emit = (eventName: string, lng: number, lat: number): void => {
    handlers[eventName]?.({
      lngLat: { lng, lat },
      point: { x: lng, y: lat },
      preventDefault: vi.fn(),
    });
  };
  return {
    map: map as unknown as MapLibreMap,
    dragPan,
    emitClick: (lng, lat) => {
      emit("click", lng, lat);
    },
    emitDblClick: (lng, lat) => {
      emit("dblclick", lng, lat);
    },
    emitPointerDown: (lng, lat, options = {}) => {
      _emitDomPointer(canvas, "pointerdown", lng, lat, options);
    },
  };
}

export function emitWindowPointer(
  type: "pointermove" | "pointerup" | "pointercancel",
  lng = 0,
  lat = 0,
  options: PointerOptions = {},
): void {
  window.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: type === "pointermove" ? 1 : 0,
      clientX: lng,
      clientY: lat,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
    }),
  );
}

/** Dispatches a pointer event at overlay chrome in map-pixel coordinates. */
export function emitTargetPointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup",
  clientX: number,
  clientY: number,
  options: PointerOptions = {},
): void {
  _emitDomPointer(target, type, clientX, clientY, options);
}
