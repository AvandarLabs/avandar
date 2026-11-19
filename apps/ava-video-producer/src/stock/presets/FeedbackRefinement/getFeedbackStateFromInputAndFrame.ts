import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./FeedbackRefinement.schema";
/** Data for getFeedbackStateFromInputAndFrame. */
type GetFeedbackStateResult = {
  roundIndex: number;
  round: { label: string; draft: string; feedback: string; revised: string };
  x: number;
  revision: number;
  doneAt: number;
};

/** Resolve the moving draft and returned note without retaining frame state. */
export function getFeedbackStateFromInputAndFrame({
  frame,
  input,
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): GetFeedbackStateResult {
  const travel = motion.travel.easing;
  const isSingle = input.rounds.length === 1;
  const roundIndex = isSingle
    ? 0
    : Math.min(1, Math.max(0, Math.floor((frame - 32) / 56)));
  const start = 32 + roundIndex * 56;
  const reviewAt = isSingle ? 62 : start + 20;
  const returnAt = isSingle ? 94 : start + 56;
  const outward = ramp(frame, start, reviewAt - start, travel);
  const returning = ramp(frame, reviewAt, returnAt - reviewAt, travel);
  const doneAt = isSingle ? 132 : 144;
  // A single round closes cue to cue, from its return until it is done.
  const closing = isSingle ? ramp(frame, 94, doneAt - 94, travel) : 0;
  const x = 100 + 460 * (outward - returning + closing);
  const revision = ramp(frame, reviewAt + 8, returnAt - reviewAt - 8, travel);
  return {
    roundIndex,
    round: input.rounds[roundIndex],
    x,
    revision,
    doneAt,
  };
}
