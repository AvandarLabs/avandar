import { EASE, mix, ramp } from "../../../motion";
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

/** Proportional waiting geometry and the operation's bounded retry journey. */
export function getBackoffStateFromInputAndFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): {
  markers: GetBackoffStateMarkers[];
  tokenX: number;
  tokenY: number;
} {
  const waits = input.attempts.slice(0, -1);
  const totalDelay = waits.reduce(
    (total, attempt) => total + attempt.delayAfter,
    0,
  );
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
  const active =
    [...markers].reverse().find((marker) => frame >= marker.at) ?? markers[0];
  const excursion = Math.sin(Math.PI * ramp(frame, active.at, 12, EASE.inOut));
  const travel = active.attempt.delayAfter
    ? ramp(
        frame,
        active.at + 12,
        (waitFrames * active.attempt.delayAfter) / totalDelay,
        EASE.inOut,
      )
    : 0;
  return {
    markers,
    tokenX: active.x + active.width * travel,
    tokenY: mix(excursion, 310, 258),
  };
}
