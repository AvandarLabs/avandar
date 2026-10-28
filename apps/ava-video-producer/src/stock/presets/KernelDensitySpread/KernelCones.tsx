import { ramp } from "../../../motion";
import { getKernelSamplesFromInput } from "./getKernelSamplesFromInput";
import type { Input } from "./KernelDensitySpread.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Weighted cones rise over fixed observations and change radius together. */
export function KernelCones({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { radius } = getKernelSamplesFromInput({ input, frame });
  return (
    <g>
      {input.points.map((point, index) => {
        const height = point.weight * 12 * ramp(frame, 13 + index * 2, 34);
        const center = { cx: 180 + point.x * 2.8, cy: 200 + point.y * 2.8 };
        return frame < 106 || input.showKernels ? (
          <g key={point.id} opacity={ramp(frame, 13 + index * 2, 34)}>
            <circle
              data-kernel-boundary={point.id}
              {...center}
              r={radius * 2.8}
              fill="none"
              stroke={accent}
              strokeOpacity={0.32}
            />
            <path
              data-cone={point.id}
              d={`M ${center.cx - radius * 2.8} ${center.cy} L ${center.cx} ${center.cy - height} L ${center.cx + radius * 2.8} ${center.cy} Z`}
              fill={accent}
              fillOpacity={0.04}
              stroke={accent}
              strokeOpacity={0.4}
            />
          </g>
        ) : undefined;
      })}
    </g>
  );
}
