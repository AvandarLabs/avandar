import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./SchoolTransitionRehearsal.schema";
/** Data for getRehearsalFromFrame. */
type GetRehearsalFromFrameResult = {
  learnerX: number;
  companionX: number;
  doorWidth: number;
  touch: number;
  finalStep: number;
};

/**
 * Spatial rehearsal state keeps locker handling ahead of classroom approach.
 */
export function getRehearsalFromFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): GetRehearsalFromFrameResult {
  const approach = ramp(frame, 30, 20, EASE.inOut);
  const finalStep = ramp(frame, 76, 32, EASE.inOut);
  const learnerX = mix(finalStep, mix(approach, 200, 390), 730);
  const companionX = mix(
    finalStep,
    mix(approach, 115, 290),
    input.finalStepSupport === "alongside" ? 625 : 510,
  );
  const doorWidth = mix(ramp(frame, 52, 12, EASE.inOut), 110, 14);
  const touch = ramp(frame, 48, 4) * (1 - ramp(frame, 68, 6));
  return { learnerX, companionX, doorWidth, touch, finalStep };
}
