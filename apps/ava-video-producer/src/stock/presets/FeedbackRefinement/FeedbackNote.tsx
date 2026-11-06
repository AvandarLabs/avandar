import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  round: Input["rounds"][number];
  index: number;
  numRounds: number;
  showReviewTrail: boolean;
};
/** A returned feedback tab detaches into its own reserved trail slot. */
export function FeedbackNote({
  frame,
  round,
  index,
  numRounds,
  showReviewTrail,
}: Readonly<Props>): ReactNode {
  const start = 32 + index * 56,
    reviewAt = numRounds === 1 ? 62 : start + 20,
    returnAt = numRounds === 1 ? 94 : start + 56;
  const outward = ramp(frame, start, reviewAt - start, EASE.inOut),
    returning = ramp(frame, reviewAt, returnAt - reviewAt, EASE.inOut);
  const detach = ramp(frame, returnAt, 16);
  const draftX = 100 + 460 * (outward - returning);
  const x = mix(detach, draftX - 10, 80 + index * 410),
    y = mix(detach, 350, 500);
  const opacity =
    ramp(frame, reviewAt - 8, 8) * (showReviewTrail ? 1 : 1 - detach);
  return (
    <g opacity={opacity}>
      <path
        data-feedback-tether={index}
        d={`M${draftX + 150} 320 L${x + 160} ${y}`}
        stroke={STOCK.orange}
        opacity={1 - detach}
      />
      <rect
        data-feedback-round={index}
        x={x}
        y={y}
        width={mix(detach, 320, 390)}
        height={78}
        rx={6}
        fill={STOCK.elevated}
        stroke={STOCK.orange}
        strokeOpacity={mix(detach, 1, 0.4)}
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
        color={STOCK.orange}
      />
    </g>
  );
}
