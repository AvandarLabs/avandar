import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  round: Input["rounds"][number];
  index: number;
  numRounds: number;
  showReviewTrail: boolean;
};

/** Frames a returned note takes to detach into its trail slot. */
const DETACH_FRAMES = 16;
/** A note's corner before the corner style scales it. */
const NOTE_CORNER = 6;
/** A returned feedback tab detaches into its own reserved trail slot. */
export function FeedbackNote({
  frame,
  round,
  index,
  numRounds,
  showReviewTrail,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const start = 32 + index * 56,
    reviewAt = numRounds === 1 ? 62 : start + 20,
    returnAt = numRounds === 1 ? 94 : start + 56;
  const outward = ramp(frame, start, reviewAt - start, motion.travel.easing),
    returning = ramp(
      frame,
      reviewAt,
      returnAt - reviewAt,
      motion.travel.easing,
    );
  const detach = ramp(
    frame,
    returnAt,
    motion.scale(DETACH_FRAMES),
    motion.entrance.easing,
  );
  const draftX = 100 + 460 * (outward - returning);
  const x = mix(detach, draftX - 10, 80 + index * 410),
    y = mix(detach, 350, 500);
  const opacity =
    ramp(frame, reviewAt - motion.whip, motion.whip, motion.reveal.easing) *
    (showReviewTrail ? 1 : 1 - detach);
  return (
    <g opacity={opacity}>
      <g data-feedback-tether={index}>
        <SketchedShape
          shape={{ kind: "path", d: `M${draftX + 150} 320 L${x + 160} ${y}` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          opacity={1 - detach}
        />
      </g>
      <StockRect
        data-feedback-round={index}
        x={x}
        y={y}
        width={mix(detach, 320, 390)}
        height={78}
        rx={scales.corner(NOTE_CORNER)}
        fill={tokens.color.elevated}
        stroke={tokens.color.highlight}
        strokeOpacity={mix(detach, 1, atomic.opacity["40"])}
      />
      <FitText
        text={round.feedback}
        x={x + 16}
        y={y + 27}
        width={288}
        fontSize={16}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
        color={tokens.color.highlight}
      />
    </g>
  );
}
