import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BoundaryCallout } from "./BoundaryCallout";
import { type Props } from "./StratumBoundaryShared.types";
import type { ReactNode } from "react";
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
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
