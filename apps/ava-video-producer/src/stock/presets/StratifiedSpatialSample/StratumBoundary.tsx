import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
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
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
            scales.wash(atomic.opacity["6"]) *
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
      <BoundaryCallout
        stratum={stratum}
        index={index}
        frame={frame}
        color={color}
      />
    </g>
  );
}

/** The callout from the boundary's first corner to its key at the map edge. */
function BoundaryCallout({
  stratum,
  index,
  frame,
  color,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const [firstX, firstY] = stratum.polygon[0];
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${70 + firstX * 4.8} ${170 + firstY * 2.7} L${70 + index * 120} 456`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        strokeOpacity={
          atomic.opacity["30"] *
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
        fontWeight={tokens.text.graphic.data.fontWeight}
      >
        {index + 1}
      </text>
    </>
  );
}
