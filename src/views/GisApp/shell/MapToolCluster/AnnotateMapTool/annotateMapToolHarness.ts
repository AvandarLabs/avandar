/**
 * Shared map-tool fakes and pointer helpers for AnnotateMapTool tests.
 */
import { vi } from "vitest";
import { fireEvent, screen } from "@/test-utils";
import type { Map as MapLibreMap } from "maplibre-gl";

type MapPointerHandler = (event: {
  lngLat: { lng: number; lat: number };
  preventDefault: () => void;
}) => void;

export function createFakeMap(): {
  map: MapLibreMap;
  dragPan: {
    disable: ReturnType<typeof vi.fn>;
    enable: ReturnType<typeof vi.fn>;
  };
  emitClick: (lng: number, lat: number) => void;
  emitPointerDown: (lng: number, lat: number) => void;
} {
  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  const handlers: Record<string, MapPointerHandler | undefined> = {};
  const dragPan = { disable: vi.fn(), enable: vi.fn() };
  const map = {
    on: (eventName: string, handler: MapPointerHandler) => {
      handlers[eventName] = handler;
    },
    off: vi.fn(),
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
  };
  const emit = (eventName: string, lng: number, lat: number): void => {
    handlers[eventName]?.({
      lngLat: { lng, lat },
      preventDefault: vi.fn(),
    });
  };
  const emitPointer = (
    target: EventTarget,
    type: string,
    lng: number,
    lat: number,
  ): void => {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
        buttons: type === "pointermove" ? 1 : 0,
        clientX: lng,
        clientY: lat,
      }),
    );
  };
  return {
    map: map as unknown as MapLibreMap,
    dragPan,
    emitClick: (lng, lat) => {
      emit("click", lng, lat);
    },
    emitPointerDown: (lng, lat) => {
      emitPointer(canvas, "pointerdown", lng, lat);
    },
  };
}

export function emitWindowPointer(
  type: "pointermove" | "pointerup" | "pointercancel",
  lng = 0,
  lat = 0,
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
    }),
  );
}

export async function openAnnotateSubCluster(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Annotate the map" }));
  await screen.findByRole("button", { name: "Place text" });
}
