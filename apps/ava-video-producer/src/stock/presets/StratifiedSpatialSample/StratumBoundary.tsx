import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

/** A stratum's tint, before the theme's tint strength. */
const STRATUM_TINT = 0.06;
/** How strongly a stratum's callout leader shows. */
const LEADER_OPACITY = 0.3;
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
  const points = stratum.polygon
    .map(([x, y]) => {
      return `${70 + x * 4.8},${170 + y * 2.7}`;
    })
    .join(" ");
  return (
    <g>
      <g data-stratum-boundary={stratum.id}>
        <SketchedShape
          shape={{ kind: "path", d: `M${points} Z` }}
          profile={tokens.sketch.shape}
          fill={color}
          fillOpacity={
            scales.wash(STRATUM_TINT) *
            motion.ramp(frame, 18, motion.hero, motion.entrance.easing)
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
      </g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${70 + firstX * 4.8} ${170 + firstY * 2.7} L${70 + index * 120} 456`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        strokeOpacity={
          LEADER_OPACITY *
          motion.ramp(frame, 18, motion.hero, motion.entrance.easing)
        }
      />
      <text
        x={70 + index * 120}
        y={468}
        textAnchor="middle"
        fill={color}
        fontSize={tokens.text.graphic.data.fontSize}
        fontFamily={tokens.text.graphic.data.fontFamily}
      >
        {index + 1}
      </text>
    </g>
  );
}
