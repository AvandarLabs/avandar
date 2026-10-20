import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getRequestPositionFromInputAndFrame } from "./getRequestPositionFromInputAndFrame";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** The worker's arm stays in contact through the request's lift and travel. */
export function BoundaryWorker({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const request = getRequestPositionFromInputAndFrame({ frame, input });
  return (
    <g>
      <circle
        cx={85}
        cy={85}
        r={18}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        d="M65 155 V118 Q85 98 105 118 V155"
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <LabelSlots labels={[[input.workerLabel, 130, 40, 250, 12, 3]]} />
      <g opacity={ramp(frame, 39, 7)}>
        <path
          d={`M105 120 Q${request.x - 25} 65 ${request.x} ${request.y + 12}`}
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
      </g>
    </g>
  );
}
