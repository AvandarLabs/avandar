import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./FeedbackRefinement.schema";
/** Inputs for getFeedbackStateFromInputAndFrame. */
type FeedbackStateOptions = {
  frame: number;
  input: Input;
  motion: VideoMotion;
};

/** Data for getFeedbackStateFromInputAndFrame. */
type GetFeedbackStateResult = {
  roundIndex: number;
  round: Input["rounds"][number];
  x: number;
  revision: number;
  doneAt: number;
};

/** Samples the revision between the authored review and return cues. */
function _getFeedbackRevisionFromFrame({
  frame,
  reviewAt,
  returnAt,
  travel,
}: Readonly<GetFeedbackRevisionFromFrameOptions>): number {
  return Motion.ramp({
    frame,
    at: reviewAt + 8,
    dur: returnAt - reviewAt - 8,
    easing: travel,
  });
}

/** Resolve the moving draft and returned note without retaining frame state. */
export function getFeedbackStateFromInputAndFrame({
  frame,
  input,
  motion,
}: Readonly<FeedbackStateOptions>): GetFeedbackStateResult {
  const travel = motion.travel.easing;
  const isSingle = input.rounds.length === 1;
  const roundIndex = isSingle
    ? 0
    : Math.min(1, Math.max(0, Math.floor((frame - 32) / 56)));
  const start = 32 + roundIndex * 56;
  const reviewAt = isSingle ? 62 : start + 20;
  const returnAt = isSingle ? 94 : start + 56;
  const outward = Motion.ramp({
    frame,
    at: start,
    dur: reviewAt - start,
    easing: travel,
  });
  const returning = Motion.ramp({
    frame,
    at: reviewAt,
    dur: returnAt - reviewAt,
    easing: travel,
  });
  const doneAt = isSingle ? 132 : 144;
  // A single round closes cue to cue, from its return until it is done.
  const closing = isSingle
    ? Motion.ramp({ frame, at: 94, dur: doneAt - 94, easing: travel })
    : 0;
  const x = 100 + 460 * (outward - returning + closing);
  const revision = _getFeedbackRevisionFromFrame({
    frame,
    reviewAt,
    returnAt,
    travel,
  });
  return { roundIndex, round: input.rounds[roundIndex], x, revision, doneAt };
}

type GetFeedbackRevisionFromFrameOptions = {
  frame: number;
  reviewAt: number;
  returnAt: number;
  travel: VideoMotion["travel"]["easing"];
};
