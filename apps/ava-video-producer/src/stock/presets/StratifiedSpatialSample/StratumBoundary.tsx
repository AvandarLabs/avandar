import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

type Props = {
  stratum: Input["strata"][number];
  index: number;
  frame: number;
  color: string;
};
/**
 * A keyed map-edge callout identifies each boundary without crossing copy
 * rails.
 */
export function StratumBoundary({
  stratum,
  index,
  frame,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const [firstX, firstY] = stratum.polygon[0];
  return (
    <g>
      <polygon
        data-stratum-boundary={stratum.id}
        points={stratum.polygon
          .map(([x, y]) => {
            return `${70 + x * 4.8},${170 + y * 2.7}`;
          })
          .join(" ")}
        fill={color}
        fillOpacity={
          0.06 * motion.ramp(frame, 18, motion.hero, motion.entrance.easing)
        }
        stroke={color}
        strokeOpacity={motion.ramp(
          frame,
          18,
          motion.hero,
          motion.reveal.easing,
        )}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${70 + firstX * 4.8} ${170 + firstY * 2.7} L${70 + index * 120} 456`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        strokeOpacity={
          0.3 * motion.ramp(frame, 18, motion.hero, motion.entrance.easing)
        }
      />
      <text
        x={70 + index * 120}
        y={468}
        textAnchor="middle"
        fill={color}
        fontSize={12}
      >
        {index + 1}
      </text>
    </g>
  );
}
