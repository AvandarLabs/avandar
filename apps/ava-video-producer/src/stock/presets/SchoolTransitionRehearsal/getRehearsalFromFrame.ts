import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): GetRehearsalFromFrameResult {
  const approach = motion.ramp(
    frame,
    30,
    motion.scale(20),
    motion.travel.easing,
  );
  const finalStep = motion.ramp(
    frame,
    76,
    motion.scale(32),
    motion.travel.easing,
  );
  const learnerX = mix(finalStep, mix(approach, 200, 390), 730);
  const companionX = mix(
    finalStep,
    mix(approach, 115, 290),
    input.finalStepSupport === "alongside" ? 625 : 510,
  );
  const doorWidth = mix(
    motion.ramp(frame, 52, motion.scale(12), motion.travel.easing),
    110,
    14,
  );
  const touch =
    motion.ramp(frame, 48, motion.press.duration, motion.entrance.easing) *
    (1 - motion.ramp(frame, 68, motion.chip, motion.exit.easing));
  return { learnerX, companionX, doorWidth, touch, finalStep };
}
