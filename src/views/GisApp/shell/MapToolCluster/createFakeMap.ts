/**
 * Shared map-tool fake for MapToolCluster tests.
 */
import { vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";

type MapClickHandler = (event: {
  lngLat: { lng: number; lat: number };
}) => void;

export function createFakeMap(): {
  map: MapLibreMap;
  emitClick: (lng: number, lat: number) => void;
} {
  const handlers: Record<string, MapClickHandler | undefined> = {};
  const map = {
    on: (eventName: string, handler: MapClickHandler) => {
      handlers[eventName] = handler;
    },
    off: vi.fn(),
    doubleClickZoom: { disable: vi.fn(), enable: vi.fn() },
  };
  return {
    map: map as unknown as MapLibreMap,
    emitClick: (lng, lat) => {
      handlers.click?.({ lngLat: { lng, lat } });
    },
  };
}
