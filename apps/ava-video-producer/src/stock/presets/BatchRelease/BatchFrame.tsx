import { ramp } from "../../../motion";
import type { ReactNode } from "react";
type Props = {
  batchId: string;
  isComplete: boolean;
  x: number;
  y: number;
  width: number;
  frame: number;
  completeAt: number;
  accent: string;
};
/** The handling boundary seals after the final member reaches its slot. */
export function BatchFrame({
  batchId,
  isComplete,
  x,
  y,
  width,
  frame,
  completeAt,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-batch-envelope={batchId}
        data-complete={isComplete}
        x={x}
        y={y}
        width={width}
        height={130}
        rx={12}
        fill={accent}
        fillOpacity={0.035}
        stroke="none"
      />
      <path
        d={`M${x} ${y + 20} V${y + 130} H${x + width} V${y + 20}`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <path
        data-envelope-seal={batchId}
        d={`M${x} ${y + 20} V${y} H${x + width} V${y + 20}`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        strokeDasharray={width + 40}
        strokeDashoffset={(width + 40) * (1 - ramp(frame, completeAt - 2, 2))}
      />
    </g>
  );
}
