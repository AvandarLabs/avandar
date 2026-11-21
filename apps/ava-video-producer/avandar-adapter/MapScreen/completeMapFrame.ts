import { prop } from "@avandar/utils";
import { cancelRender } from "remotion";
import { selectedCoordinates } from "./mapFixtures";
import type { Map } from "maplibre-gl";
import type { RefObject } from "react";
/** Require real loaded geography and place the measured feature pointer. */
export function completeMapFrame({
  map,
  root,
  pointTarget,
  completeRender,
}: Readonly<{
  map: Map;
  root: RefObject<HTMLDivElement | null>;
  pointTarget: RefObject<HTMLSpanElement | null>;
  completeRender: () => void;
}>): void {
  // Idle alone is insufficient if a provider returned an empty/failed
  // style. Require the actual vector source, loaded tiles and rendered
  // geography.
  const basemapLayers = (map.getStyle().layers ?? [])
    .filter((layer) => {
      return "source" in layer && layer.source === "openmaptiles";
    })
    .map(prop("id"));
  const geography = basemapLayers.length
    ? map.queryRenderedFeatures({ layers: basemapLayers }).length
    : 0;
  if (
    !map.isStyleLoaded() ||
    !map.areTilesLoaded() ||
    !map.getSource("openmaptiles") ||
    geography === 0
  ) {
    cancelRender(
      new Error("Avandar basemap tiles or geographic features are missing"),
    );
    return;
  }
  if (root.current) {
    root.current.dataset.basemapReady = "true";
    root.current.dataset.basemapFeatures = String(geography);
  }
  if (pointTarget.current) {
    const point = map.project(selectedCoordinates);
    pointTarget.current.style.left = `${point.x - 6}px`;
    pointTarget.current.style.top = `${point.y - 6}px`;
  }
  completeRender();
}
