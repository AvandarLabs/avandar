import {
  RACE_AT,
  RACE_FRAMES,
  GROW_AT,
  LABEL_RETURN_AT,
} from "./BarRace.constants";
import type {
  GetBarRaceBarsStateOptions,
  GetBarRaceBarsStateResult,
} from "./BarRace.types";

/** Supplies BarRace with frame-specific rendering geometry or progress. */
export function getRaceProgressFromFrame({
  input,
  frame,
  stroke,
  shapes,
  motion,
}: Readonly<GetBarRaceBarsStateOptions>): GetBarRaceBarsStateResult {
  const bars = input.bars;
  const t = motion.ramp(
    frame,
    RACE_AT,
    motion.scale(RACE_FRAMES),
    motion.travel.easing,
  );
  const enter = motion.ramp(frame, GROW_AT, motion.hero);
  const labelOpacity =
    1 -
    motion.ramp(frame, RACE_AT, motion.chip) +
    motion.ramp(frame, LABEL_RETURN_AT, motion.panel);
  const hairline = shapes.stroke(stroke.hairline);
  return { bars, t, enter, labelOpacity, hairline };
}
