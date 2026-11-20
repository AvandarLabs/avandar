import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./StratumBoundaryShared.types";
import type { ReactNode } from "react";
/** The callout from the boundary's first corner to its key at the map edge. */
export function BoundaryCallout({
  stratum,
  index,
  frame,
  color,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
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
