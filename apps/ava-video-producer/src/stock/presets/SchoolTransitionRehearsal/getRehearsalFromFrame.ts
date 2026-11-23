import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./SchoolTransitionRehearsal.schema";

/** Data for getRehearsalFromFrame. */
type GetRehearsalFromFrameResult = {
  learnerX: number;
  companionX: number;
  doorWidth: number;
  touch: number;
  finalStep: number;
};

type FinalStepOptions = {
  frame: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["frame"];
  input: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"];
  motion: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["motion"];
  approach: number;
};

type FinalStepResult = {
  finalStep: number;
  learnerX: number;
  companionX: number;
  doorWidth: number;
};

/**
 * Samples the rehearsal from frame final step state for the current authored
 * frame.
 */
function _getRehearsalFromFrameFinalStepState({
  frame,
  input,
  motion,
  approach,
}: Readonly<FinalStepOptions>): FinalStepResult {
  const finalStep = motion.ramp(
    frame,
    76,
    motion.scale(32),
    motion.travel.easing,
  );
  const learnerX = Motion.mix({
    t: finalStep,
    from: Motion.mix({
      t: approach,
      from: 200,
      to: 390,
    }),
    to: 730,
  });
  const companionX = Motion.mix({
    t: finalStep,
    from: Motion.mix({
      t: approach,
      from: 115,
      to: 290,
    }),
    to: input.finalStepSupport === "alongside" ? 625 : 510,
  });
  const doorWidth = Motion.mix({
    t: motion.ramp(frame, 52, motion.scale(12), motion.travel.easing),
    from: 110,
    to: 14,
  });
  return { finalStep, learnerX, companionX, doorWidth };
}

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
  const { finalStep, learnerX, companionX, doorWidth } =
    _getRehearsalFromFrameFinalStepState({ frame, input, motion, approach });
  const touch =
    motion.ramp(frame, 48, motion.press.duration, motion.entrance.easing) *
    (1 - motion.ramp(frame, 68, motion.chip, motion.exit.easing));
  return { learnerX, companionX, doorWidth, touch, finalStep };
}
