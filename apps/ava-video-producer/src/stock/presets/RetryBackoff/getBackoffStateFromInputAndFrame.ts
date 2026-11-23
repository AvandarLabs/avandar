import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./RetryBackoff.schema";

/** Data for getBackoffStateFromInputAndFrame. */
type GetBackoffStateMarkers = {
  x: number;
  at: number;
  width: number;
  attempt: {
    label: string;
    outcome: "retry" | "complete" | "stop";
    delayAfter: number;
  };
  index: number;
};

/** Places every attempt marker along its proportional authored wait. */
function _getAttemptMarkers(input: Readonly<Input>): {
  markers: GetBackoffStateMarkers[];
  waitFrames: number;
  totalDelay: number;
} {
  const waits = input.attempts.slice(0, -1);
  const totalDelay = waits.reduce((total, attempt) => {
    return total + attempt.delayAfter;
  }, 0);
  const waitFrames = 104 - input.attempts.length * 12;
  let x = 80;
  let at = 36;
  const markers = input.attempts.map((attempt, index) => {
    const marker = {
      x,
      at,
      width: (800 * attempt.delayAfter) / totalDelay,
      attempt,
      index,
    };
    x += marker.width;
    at += 12 + (waitFrames * attempt.delayAfter) / totalDelay;
    return marker;
  });
  return { markers, waitFrames, totalDelay };
}

/** Proportional waiting geometry and the operation's bounded retry journey. */
export function getBackoffStateFromInputAndFrame({
  frame,
  input,
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): {
  markers: GetBackoffStateMarkers[];
  tokenX: number;
  tokenY: number;
} {
  const { markers, waitFrames, totalDelay } = _getAttemptMarkers(input);
  const active =
    [...markers].reverse().find((marker) => {
      return frame >= marker.at;
    }) ?? markers[0];
  const excursion = Math.sin(
    Math.PI *
      motion.ramp(frame, active.at, motion.scale(12), motion.travel.easing),
  );
  const travel = active.attempt.delayAfter
    ? motion.ramp(
        frame,
        active.at + 12,
        (waitFrames * active.attempt.delayAfter) / totalDelay,
        motion.travel.easing,
      )
    : 0;
  return {
    markers,
    tokenX: active.x + active.width * travel,
    tokenY: Motion.mix({
      t: excursion,
      from: 310,
      to: 258,
    }),
  };
}
