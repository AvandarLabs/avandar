import type { PlaceCoordinate } from "@/clients/places/places.types";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

/** What the place tool's click gesture reports to. */
export type PlaceGestureCallbacks = {
  onPlacePicked: (coordinate: PlaceCoordinate) => void;
  onMapToolModeChange: (mode: MapToolMode) => void;
};

/**
 * Arms the "Add a place" tool: the next map click becomes the place's
 * location and the tool returns to Pan. Escape cancels. Registered by
 * `useMapToolGestures` while the mode is `{ type: "place" }`.
 */
export function attachPlaceGestures(
  map: MapLibreMap,
  callbacks: PlaceGestureCallbacks,
): () => void {
  const onClick = (event: MapMouseEvent): void => {
    callbacks.onPlacePicked({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
    });
    callbacks.onMapToolModeChange({ type: "pan" });
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      callbacks.onMapToolModeChange({ type: "pan" });
    }
  };
  map.on("click", onClick);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    map.off("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
  };
}
