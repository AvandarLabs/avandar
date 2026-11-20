import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  entryId: string;
  index: number;
  frame: number;
  accent: string;
  isVisible: boolean;
};
/** The cue the first impression presses into storage on. */
const FIRST_IMPRESSION_CUE = 44;
/** Frames between impressions, matching the writing cadence. */
const CADENCE_FRAMES = 16;
/**
 * A shallow engraved impression remains after its matching entry is written.
 */
export function LedgerImpression({
  entryId,
  index,
  frame,
  accent,
  isVisible,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const pressAt = FIRST_IMPRESSION_CUE + index * CADENCE_FRAMES;
  const impression = ramp(frame, pressAt, motion.chip, motion.entrance.easing);
  if (!isVisible || frame < pressAt) {
    return undefined;
  }
  return (
    <g
      data-local-impression={entryId}
      transform={`translate(${220 + index * 136} ${mix(impression, 422, 448)})`}
      opacity={impression}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M0 0 h112 v22 h-112 z" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.elevated}
        stroke={accent}
        strokeOpacity={atomic.opacity["55"]}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M12 8 h82 M12 14 h56" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
