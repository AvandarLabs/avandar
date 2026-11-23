import { useCallback } from "react";
import { cancelRender } from "remotion";
import { completeMapFrame } from "./completeMapFrame";
import type { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import type { ErrorEvent as MapLibreErrorEvent } from "maplibre-gl";
import type { RefObject } from "react";
/** Register per-frame idle/error listeners and return their exact cleanup. */
export function useMapFramePreparation({
  mapInstance,
  root,
  pointTarget,
}: Readonly<{
  mapInstance: ReturnType<typeof useMapCanvas>["mapInstance"];
  root: RefObject<HTMLDivElement | null>;
  pointTarget: RefObject<HTMLSpanElement | null>;
}>): (completeRender: () => void) => (() => void) | undefined {
  const prepareFrame = useCallback(
    (completeRender: () => void) => {
      const map = mapInstance.mapRef.current;
      if (!map) {
        return;
      }
      const complete = () => {
        completeMapFrame({ map, root, pointTarget, completeRender });
      };
      const onError = (event: MapLibreErrorEvent) => {
        cancelRender(
          new Error(event.error.message || "Native map failed to render"),
        );
      };
      map.once("idle", complete);
      // useCommittedRenderDelay invokes this callback's returned listener
      // cleanup before the next frame and on unmount.
      // react-doctor-disable-next-line effect-needs-cleanup
      map.on("error", onError);
      map.resize();
      map.triggerRepaint();
      return () => {
        map.off("idle", complete);
        map.off("error", onError);
      };
    },
    [mapInstance, root, pointTarget],
  );
  return prepareFrame;
}
