import { useMemo } from "react";
import { EASE, Motion } from "../../src/motion";
import { makeMapSpecFromLayers } from "./makeMapSpecFromLayers";
import { caseLayer, facilityLayer, selectedCoordinates } from "./mapFixtures";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
/** Frame-sampled layers, specification, selection and native camera. */
type MapFixture = {
  layers: MapLayer.T[];
  spec: ReturnType<typeof makeMapSpecFromLayers>;
  selected: MapLayer.T;
  view: { center: [number, number]; zoom: number };
};
/** Sample layer visibility and the native camera using the authored frame. */
export function useMapFixture({
  frame,
}: Readonly<{ frame: number }>): MapFixture {
  const isFacilityHidden = frame >= 308 && frame < 388;
  const layers = useMemo(() => {
    return [caseLayer, { ...facilityLayer, isVisible: !isFacilityHidden }];
  }, [isFacilityHidden]);
  const spec = useMemo(() => {
    return makeMapSpecFromLayers(layers);
  }, [layers]);
  const selected = frame < 98 ? caseLayer : layers[1]!;
  const camera = Motion.ramp({
    frame,
    at: 448,
    dur: 66,
    easing: EASE.inOut,
  });
  const view = useMemo(() => {
    return {
      center: [
        Motion.mix({
          t: camera,
          from: 10.12,
          to: selectedCoordinates[0] + 0.012,
        }),
        Motion.mix({
          t: camera,
          from: 10.08,
          to: selectedCoordinates[1] + 0.01,
        }),
      ] as [number, number],
      zoom: Motion.mix({
        t: camera,
        from: 10.15,
        to: 11.05,
      }),
    };
  }, [camera]);
  return { layers, spec, selected, view };
}
