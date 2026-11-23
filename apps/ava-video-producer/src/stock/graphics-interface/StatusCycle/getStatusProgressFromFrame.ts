import { PROGRESS_INSET } from "./StatusCycle.constants";
import type { StatusCycleInput } from "../../presets/StatusCycle/StatusCycle.schema";
import type { Drawing } from "./StatusCycle.types";

/** Supplies StatusCycle with frame-specific rendering geometry or progress. */
export function getStatusProgressFromFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: StatusCycleInput;
  frame: number;
  motion: Drawing["motion"];
}>): Pick<Drawing, "states" | "processing" | "complete" | "progress"> {
  const states = input.states;
  const processing =
    motion.ramp(frame, states[1].at, motion.chip) *
    (1 - motion.ramp(frame, states[states.length - 1].at, motion.chip));
  const complete = motion.ramp(
    frame,
    states[states.length - 1].at,
    motion.chip,
  );
  const progress = motion.ramp(
    frame,
    states[1].at + PROGRESS_INSET,
    Math.max(
      1,
      states[states.length - 1].at - states[1].at - PROGRESS_INSET * 2,
    ),
    motion.travel.easing,
  );
  return { states, processing, complete, progress };
}
