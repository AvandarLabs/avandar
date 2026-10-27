import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  cellId: string;
  x: number;
  y: number;
  frame: number;
  index: number;
  isSuppressed: boolean;
};
/**
 * An adjacent release gate closes without covering the analytical local count.
 */
export function ThresholdShutter({
  cellId,
  x,
  y,
  frame,
  index,
  isSuppressed,
}: Readonly<Props>): ReactNode {
  const shutter = isSuppressed ? ramp(frame, 51 + index * 4, 34) : 0;
  return (
    <g>
      <rect
        data-threshold-shutter={cellId}
        x={x + 174}
        y={y + 56}
        width={14}
        height={30 * shutter}
        fill={STOCK.surface}
        stroke={STOCK.orange}
        strokeOpacity={shutter}
      />
      <path
        d={`M${x + 176} ${y + 58} l10 ${26 * shutter} M${x + 186} ${y + 58} l-10 ${26 * shutter}`}
        fill="none"
        stroke={STOCK.orange}
        opacity={shutter}
      />
    </g>
  );
}
