import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReviewLatchShared } from "./ReviewLatchShared";
import type { ReactNode } from "react";

type Props = {
  side: "left" | "right";
  reach: number;
  color: string;
};

/** One side of the latch, reaching in toward the centre as it closes. */
export function LatchArm({ side, reach, color }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-review-latch={side}>
      <SketchedShape
        shape={{ kind: "path", d: `M${480 + reach} 260 v36 h${-reach}` }}
        profile={tokens.sketch.shape}
        stroke={color}
        fill="none"
        strokeWidth={scales.stroke(ReviewLatchShared.LATCH_STROKE)}
      />
    </g>
  );
}
