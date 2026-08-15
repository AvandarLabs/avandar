import { useEffect, useRef } from "react";
import { MapInstanceHelpers } from "@/views/GisApp/MapCanvas/MapInstanceHelpers";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapInstanceRefs } from "@/views/GisApp/MapCanvas/MapInstanceHelpers";
import type { LatestMapValues } from "@/views/GisApp/MapCanvas/useLatestMapValues";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dispatch, RefObject, SetStateAction } from "react";

type AttachMapInstanceOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  emptySpec: MapSpec;
  initialView: AvaMap.ViewState;
  instanceRefs: MapInstanceRefs;
  latestValues: LatestMapValues;
  setStyleLoadCount: Dispatch<SetStateAction<number>>;
};

/** Creates the MapLibre instance once and tears it down with the canvas. */
export function useAttachMapInstance({
  containerRef,
  emptySpec,
  initialView,
  instanceRefs,
  latestValues,
  setStyleLoadCount,
}: Readonly<AttachMapInstanceOptions>): void {
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
