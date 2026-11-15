import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getRequestPositionFromInputAndFrame } from "./getRequestPositionFromInputAndFrame";
import { RequestDisposition } from "./RequestDisposition";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Outstanding request remains explicit in the tray or selected empty slot. */
export function BoundaryRequest({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const position = getRequestPositionFromInputAndFrame({ frame, input });
  return (
    <g>
      <RequestDisposition frame={frame} input={input} accent={accent} />
      <g
        data-request={input.request.placement}
        data-request-outstanding="true"
        opacity={ramp(frame, 39, 7)}
      >
        <rect
          data-request-body="true"
          x={position.x}
          y={position.y}
          width={position.width}
          height={position.height}
          rx={6}
          fill={STOCK.elevated}
          stroke={accent}
        />
        <circle
          data-worker-hand="true"
          cx={position.x}
          cy={position.y + 12}
          r={5}
          fill={accent}
        />
        <LabelSlots
          labels={[
            [
              input.request.label,
              position.x + 7,
              position.y + 20,
              position.width - 14,
              12,
              5,
            ],
          ]}
        />
      </g>
    </g>
  );
}
