import { mix, ramp } from "../../../motion";
import { cubicPoint } from "../../graphics-common";
import { useGraphicMotion, useGraphicProps } from "../../theme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { frame: number; x: number; accent: string; branchId: string };

const DEPART_CUE = 74;
const DEPART_FRAMES = 40;
const DROP_CUE = 18;
const DROP_FRAMES = 18;
const APPEAR_CUE = 12;
const APPEAR_FRAMES = 6;

/** The single scenario marker pauses at the junction then takes one branch. */
export function DecisionMarker({
  frame,
  x,
  accent,
  branchId,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DecisionFork", {});
  const motion = useGraphicMotion();
  const progress = ramp(
    frame,
    DEPART_CUE,
    motion.scale(DEPART_FRAMES),
    motion.travel.easing,
  );
  const point = cubicPoint(
    { x: 480, y: 235 },
    { x: 480, y: 280 },
    { x, y: 280 },
    { x, y: 408 },
    progress,
  );
  const markerY =
    frame < DEPART_CUE
      ? mix(
          ramp(
            frame,
            DROP_CUE,
            motion.scale(DROP_FRAMES),
            motion.travel.easing,
          ),
          174,
          235,
        )
      : point.y;
  return (
    <g
      data-marker-branch={branchId}
      opacity={ramp(frame, APPEAR_CUE, motion.scale(APPEAR_FRAMES))}
    >
      <circle
        cx={point.x}
        cy={markerY}
        r={style.markerRadius}
        fill={accent}
        fillOpacity={style.markerAlpha}
      />
      <circle
        cx={point.x}
        cy={markerY}
        r={style.markerCoreRadius}
        fill={accent}
      />
    </g>
  );
}
