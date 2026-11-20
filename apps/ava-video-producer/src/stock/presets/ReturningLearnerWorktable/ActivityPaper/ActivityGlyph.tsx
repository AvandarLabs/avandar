import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A returning arrow for a review activity, a zigzag for a new one. */
export function ActivityGlyph({
  isReview,
  accent,
}: Readonly<{ isReview: boolean; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: isReview
          ? "M-10 3 Q-14 -11 0 -11 Q14 -11 10 3 M4 -2 L10 4 L15 -3"
          : "M-11 -4 L-3 5 L4 -4 L12 5",
      }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
