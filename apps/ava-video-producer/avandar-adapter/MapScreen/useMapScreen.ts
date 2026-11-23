import { prop } from "@avandar/utils";
import { useRef } from "react";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { BASEMAP, PAN } from "./mapFixtures";
import { useCommittedRenderDelay } from "./useCommittedRenderDelay/useCommittedRenderDelay";
import { useMapFixture } from "./useMapFixture";
import { useMapFramePreparation } from "./useMapFramePreparation";
import { useMapVideoTargets } from "./useMapVideoTargets";
import type { RefObject } from "react";

type Options = { frame: number; width: number; height: number };
const _noop = () => {
  return undefined;
};
/** Native controller and stable film refs alongside the sampled map layers. */
type MapScreenState = Pick<
  ReturnType<typeof useMapFixture>,
  "layers" | "selected"
> & {
  root: RefObject<HTMLDivElement | null>;
  surface: RefObject<HTMLDivElement | null>;
  pointTarget: RefObject<HTMLSpanElement | null>;
  controller: ReturnType<typeof useMapCanvas>;
  mapInstance: ReturnType<typeof useMapCanvas>["mapInstance"];
};
/**
 * Own native map refs and controller readiness for a deterministic film frame.
 */
export function useMapScreen({
  frame,
  width,
  height,
}: Readonly<Options>): MapScreenState {
  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const pointTarget = useRef<HTMLSpanElement>(null);
  const { layers, spec, selected, view } = useMapFixture({ frame });
  const controller = useMapCanvas({
    basemap: BASEMAP,
    view,
    spec,
    fitBoundsRequest: undefined,
    interactiveLayerIds: spec.layers.map(prop("id")),
    onFeatureClick: _noop,
    onViewChange: _noop,
    mapToolMode: PAN,
  });
  const { mapInstance } = controller;
  const prepareFrame = useMapFramePreparation({
    mapInstance,
    root,
    pointTarget,
  });
  useCommittedRenderDelay({
    label: `Harborfield map frame ${frame}, style ${mapInstance.styleLoadCount}, ${width}x${height}`,
    prepare: prepareFrame,
  });
  useMapVideoTargets({
    root,
    frame,
    styleLoadCount: mapInstance.styleLoadCount,
  });
  return {
    root,
    surface,
    pointTarget,
    layers,
    selected,
    controller,
    mapInstance,
  };
}
