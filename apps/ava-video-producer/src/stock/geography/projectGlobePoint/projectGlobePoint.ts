import { GlobeViewModule } from "../GlobeViewModule";
import type { GlobeView } from "../GlobeViewModule";

/**
 * Projects degree coordinates and separately identifies the visible hemisphere.
 */
export function projectGlobePoint(
  input: Readonly<GlobeView & { longitude: number; latitude: number }>,
): { x: number; y: number; visible: boolean } {
  const view = GlobeViewModule.fromInput(input);
  if (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) {
    throw new Error(
      "Latitude must be finite and within ninety degrees of the equator.",
    );
  }
  const degreesToRadians = Math.PI / 180;
  const longitudeDelta =
    (GlobeViewModule.getNormalizedLongitudeFromLongitude(input.longitude) -
      view.centerLongitude) *
    degreesToRadians;
  const latitude = input.latitude * degreesToRadians;
  const centerLatitude = view.centerLatitude * degreesToRadians;
  const depth =
    Math.sin(centerLatitude) * Math.sin(latitude) +
    Math.cos(centerLatitude) * Math.cos(latitude) * Math.cos(longitudeDelta);
  return {
    x: view.radius * Math.cos(latitude) * Math.sin(longitudeDelta),
    y:
      -view.radius *
      (Math.cos(centerLatitude) * Math.sin(latitude) -
        Math.sin(centerLatitude) *
          Math.cos(latitude) *
          Math.cos(longitudeDelta)),
    visible: depth >= 0,
  };
}
