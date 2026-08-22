import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Map as MapLibreMap } from "maplibre-gl";

import { useLayoutEffect, useState } from "react";

export type TextFeature = Extract<
  AvaMapConfig.AnnotationFeature,
  { kind: "text" }
>;

/** Projects a text annotation's anchor into overlay pixel coordinates. */
export function projectTextFeature(
  map: MapLibreMap,
  feature: TextFeature,
): { x: number; y: number } {
  const [lng, lat] = feature.geometry.coordinates;
  return map.project({ lng, lat });
}

/** Keeps the overlay pixel position in sync with the map camera. */
export function useProjectedOverlayPoint(
  map: MapLibreMap,
  feature: TextFeature,
): { x: number; y: number } {
  const [point, setPoint] = useState(() => {
    return projectTextFeature(map, feature);
  });
  useLayoutEffect(
    function syncProjectedOverlayPoint() {
      const syncPoint = (): void => {
        setPoint(projectTextFeature(map, feature));
      };
      syncPoint();
      map.on("move", syncPoint);
      map.on("zoom", syncPoint);
      return () => {
        map.off("move", syncPoint);
        map.off("zoom", syncPoint);
      };
    },
    [feature, map],
  );
  return point;
}
