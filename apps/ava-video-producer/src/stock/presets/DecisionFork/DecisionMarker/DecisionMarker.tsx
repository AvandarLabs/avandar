import { Motion } from "../../../../motion";
import { cubicPoint } from "../../../graphics-common/cubicPoint";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DecisionMarkerMarkerBranch } from "./DecisionMarkerMarkerBranch";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  x: number;
  accent: string;
  branchId: string;
};

const DEPART_CUE = 74;

const DEPART_FRAMES = 40;

const DROP_CUE = 18;

const DROP_FRAMES = 18;

/** The single scenario marker pauses at the junction then takes one branch. */
export function DecisionMarker({
  frame,
  x,
  accent,
  branchId,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = Motion.ramp({
    frame,
    at: DEPART_CUE,
    dur: motion.scale(DEPART_FRAMES),
    easing: motion.travel.easing,
  });
  const point = cubicPoint({
    a: { x: 480, y: 235 },
    b: { x: 480, y: 280 },
    c: { x, y: 280 },
    d: { x, y: 408 },
    t: progress,
  });
  const dropProgress = Motion.ramp({
    frame,
    at: DROP_CUE,
    dur: motion.scale(DROP_FRAMES),
    easing: motion.travel.easing,
  });
  const markerY =
    frame < DEPART_CUE
      ? Motion.mix({
          t: dropProgress,
          from: 174,
          to: 235,
        })
      : point.y;
  return (
    <DecisionMarkerMarkerBranch
      frame={frame}
      accent={accent}
      branchId={branchId}
      motion={motion}
      point={point}
      markerY={markerY}
    />
  );
}
