import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const shutter = isSuppressed
    ? motion.ramp(frame, 51 + index * 4, motion.scale(34))
    : 0;
  return (
    <g>
      <StockRect
        data-threshold-shutter={cellId}
        x={x + 174}
        y={y + 56}
        width={14}
        height={30 * shutter}
        fill={tokens.color.surface}
        stroke={tokens.color.highlight}
        strokeOpacity={shutter}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 176} ${y + 58} l10 ${26 * shutter} M${x + 186} ${y + 58} l-10 ${26 * shutter}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.highlight}
        opacity={shutter}
      />
    </g>
  );
}
