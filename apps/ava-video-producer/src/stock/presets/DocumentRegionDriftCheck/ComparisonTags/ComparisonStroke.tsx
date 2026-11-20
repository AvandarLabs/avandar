import { ramp } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ComparisonTagsShared } from "./ComparisonTagsShared/ComparisonTagsShared";
import type { ReactNode } from "react";

type Props = {
  y: number;
  isMatch: boolean;
  frame: number;
  at: number;
  accent: string;
};
/** One comparison stroke, in the accent on a match, drawing on from `at`. */
export function ComparisonStroke({
  y,
  isMatch,
  frame,
  at,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const draw = ramp(
    frame,
    at,
    motion.scale(ComparisonTagsShared.TAG_DRAW_FRAMES),
    motion.reveal.easing,
  );
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M456 ${y} h36` }}
      profile={tokens.sketch.shape}
      stroke={isMatch ? accent : tokens.color.highlight}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      pathLength={ComparisonTagsShared.TAG_LENGTH}
      strokeDasharray={ComparisonTagsShared.TAG_LENGTH}
      strokeDashoffset={ComparisonTagsShared.TAG_LENGTH * (1 - draw)}
    />
  );
}
