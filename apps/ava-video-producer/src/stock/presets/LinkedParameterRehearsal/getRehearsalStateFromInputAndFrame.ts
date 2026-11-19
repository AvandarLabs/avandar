import { ramp } from "../../../motion";
import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./LinkedParameterRehearsal.schema";
/** The cue the source starts to advance to its trial on. */
const ADVANCE_CUE = 36;
/** The cue the trial is labelled on, once the source has arrived. */
const TRIAL_CUE = 84;
/** The cue the source starts back to its baseline on. */
const RETURN_CUE = 102;
/** The cue the baseline is labelled restored on, once the source is back. */
const RESTORED_CUE = 144;

/**
 * The source advances to its authored trial and returns to the exact
 * baseline.
 */
export function getRehearsalStateFromInputAndFrame({
  frame,
  input,
  motion,
}: Readonly<{ frame: number; input: Input; motion: VideoMotion }>): {
  value: number;
  label: string;
} {
  // Each move lands on the cue its phase label changes on.
  const progress =
    frame <= RETURN_CUE
      ? ramp(frame, ADVANCE_CUE, TRIAL_CUE - ADVANCE_CUE, motion.travel.easing)
      : 1 -
        ramp(
          frame,
          RETURN_CUE,
          RESTORED_CUE - RETURN_CUE,
          motion.travel.easing,
        );
  const value = interpolateFiniteRange({
    from: input.source.baseline,
    to: input.source.trial,
    progress,
  });
  const label =
    frame < TRIAL_CUE
      ? input.phaseLabels.baseline
      : frame < RESTORED_CUE
        ? input.phaseLabels.trial
        : input.phaseLabels.restored;
  return { value, label };
}
