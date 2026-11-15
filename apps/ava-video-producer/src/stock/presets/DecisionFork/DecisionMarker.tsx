import { EASE, mix, ramp } from "../../../motion";
import { cubicPoint } from "../../graphics-common";
import type { ReactNode } from "react";

type Props = { frame: number; x: number; accent: string; branchId: string };

/** The single scenario marker pauses at the junction then takes one branch. */
export function DecisionMarker({
  frame,
  x,
  accent,
  branchId,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 74, 40, EASE.inOut);
  const point = cubicPoint(
    { x: 480, y: 235 },
    { x: 480, y: 280 },
    { x, y: 280 },
    { x, y: 408 },
    progress,
  );
  const markerY =
    frame < 74 ? mix(ramp(frame, 18, 18, EASE.inOut), 174, 235) : point.y;
  return (
    <g data-marker-branch={branchId} opacity={ramp(frame, 12, 6)}>
      <circle
        cx={point.x}
        cy={markerY}
        r={13}
        fill={accent}
        fillOpacity={0.12}
      />
      <circle cx={point.x} cy={markerY} r={5} fill={accent} />
    </g>
  );
}
