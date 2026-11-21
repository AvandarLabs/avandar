import { useLayoutEffect } from "react";
import { facilityLayer } from "./mapFixtures";
import type { RefObject } from "react";
/** Tag native controls and dock navigation beside the measured inspector. */
export function useMapVideoTargets({
  root,
  frame,
  styleLoadCount,
}: Readonly<{
  root: RefObject<HTMLDivElement | null>;
  frame: number;
  styleLoadCount: number;
}>): void {
  useLayoutEffect(() => {
    root.current?.querySelectorAll("button").forEach((button) => {
      const label = button.getAttribute("aria-label") ?? "";
      if (label.includes(facilityLayer.name) && /hide|show/i.test(label)) {
        button.setAttribute("data-video-target", "map-facilities-visibility");
      }
      if (
        button.textContent?.includes(facilityLayer.name) &&
        button.hasAttribute("aria-current")
      ) {
        button.setAttribute("data-video-target", "map-facilities-layer");
      }
      if (
        button.textContent?.trim() === "Data" &&
        button.closest("#gis-inspector-body")
      ) {
        button.setAttribute("data-video-target", "map-data-section");
      }
    });
    const inspector = root.current?.querySelector(
      'section[aria-labelledby="gis-inspector-title"]',
    );
    const navigation = root.current?.querySelector<HTMLElement>(
      ".maplibregl-ctrl-top-right",
    );
    if (root.current && inspector && navigation) {
      const rootBounds = root.current.getBoundingClientRect();
      const inspectorBounds = inspector.getBoundingClientRect();
      // Dock the unchanged native controls beside the measured inspector.
      // Their product default top-right slot otherwise covers Export.
      navigation.style.right = `${rootBounds.right - inspectorBounds.left + 12}px`;
      navigation.style.top = `${inspectorBounds.top - rootBounds.top}px`;
    }
  }, [frame, styleLoadCount, root]);
}
