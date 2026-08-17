import { useEffect, useRef } from "react";
import { MapInstanceHelpers } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { AttachMapInstanceInput } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { RefObject } from "react";

type UseAttachMapInstanceInput = Omit<
  AttachMapInstanceInput,
  "basemap" | "container" | "view"
> & {
  containerRef: RefObject<HTMLDivElement | null>;
  initialView: AvaMapConfig.ViewState;
};

/** Creates the MapLibre instance once and tears it down with the canvas. */
export function useAttachMapInstance({
  containerRef,
  emptySpec,
  initialView,
  instanceRefs,
  latestValues,
  setStyleLoadCount,
}: UseAttachMapInstanceInput): void {
  const initialViewRef = useRef(initialView);
  useEffect(function constructMapInstance() {
    const container = containerRef.current;
    if (!container || instanceRefs.mapRef.current) {
      return undefined;
    }
    return MapInstanceHelpers.attach({
      basemap: latestValues.basemapRef.current,
      container,
      emptySpec,
      instanceRefs,
      latestValues,
      setStyleLoadCount,
      view: initialViewRef.current,
    });
    // Construction is one-shot. Later prop changes use the map sync hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
