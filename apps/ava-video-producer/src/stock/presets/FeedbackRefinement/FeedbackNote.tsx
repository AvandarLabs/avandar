import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FeedbackNoteFeedbackRound } from "./FeedbackNoteFeedbackRound/FeedbackNoteFeedbackRound";
import { FeedbackNoteTether } from "./FeedbackNoteTether/FeedbackNoteTether";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type FeedbackNoteTravel = {
  detach: number;
  draftX: number;
  x: number;
  y: number;
  opacity: number;
};

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

type GetFeedbackNoteTravelOptions = {
  frame: number;
  index: number;
  numRounds: number;
  showReviewTrail: boolean;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored feedback note travel. */
function _getFeedbackNoteTravel({
  frame,
  index,
  numRounds,
  showReviewTrail,
  motion,
}: Readonly<GetFeedbackNoteTravelOptions>): FeedbackNoteTravel {
  const start = 32 + index * 56,
    reviewAt = numRounds === 1 ? 62 : start + 20,
    returnAt = numRounds === 1 ? 94 : start + 56;
  const outward = Motion.ramp({
      frame,
      at: start,
      dur: reviewAt - start,
      easing: motion.travel.easing,
    }),
    returning = Motion.ramp({
      frame,
      at: reviewAt,
      dur: returnAt - reviewAt,
      easing: motion.travel.easing,
    });
  const detach = Motion.ramp({
    frame,
    at: returnAt,
    dur: motion.scale(DETACH_FRAMES),
    easing: motion.entrance.easing,
  });
  const draftX = 100 + 460 * (outward - returning);
  const x = Motion.mix({ t: detach, from: draftX - 10, to: 80 + index * 410 }),
    y = Motion.mix({ t: detach, from: 350, to: 500 });
  const opacity =
    Motion.ramp({
      frame,
      at: reviewAt - motion.whip,
      dur: motion.whip,
      easing: motion.reveal.easing,
    }) * (showReviewTrail ? 1 : 1 - detach);
  return { detach, draftX, x, y, opacity };
}

/** A returned feedback tab detaches into its own reserved trail slot. */
export function FeedbackNote({
  frame,
  round,
  index,
  numRounds,
  showReviewTrail,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { detach, draftX, x, y, opacity } = _getFeedbackNoteTravel({
    frame,
    index,
    numRounds,
    showReviewTrail,
    motion,
  });
  return (
    <g opacity={opacity}>
      <FeedbackNoteTether {...{ index, tokens, detach, draftX, x, y }} />
      <FeedbackNoteFeedbackRound
        {...{ index, x, y, detach, scales }}
        noteCorner={NOTE_CORNER}
        tokens={tokens}
        atomic={atomic}
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

/** The type of `NOTE_CORNER` used by FeedbackNote. */
export type FeedbackNoteNoteCornerValue = typeof NOTE_CORNER;

/** Result of the authored FeedbackNote calculation. */
export type FeedbackNoteGetFeedbackNoteTravelValue = ReturnType<
  typeof _getFeedbackNoteTravel
>;
