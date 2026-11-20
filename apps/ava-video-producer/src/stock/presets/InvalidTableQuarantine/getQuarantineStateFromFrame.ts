import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./InvalidTableQuarantine.schema";

type QuarantineState = {
  isReplaced: boolean;
  rows: Input["originalRows"];
  arrival: number;
  height: number;
  readable: boolean;
  incoming: boolean;
  showReload: boolean;
  showAttempt: boolean;
};

/** The cue the shutter starts to close on. */
const CLOSE_CUE = 13;
/** The cue a read is attempted on, once the shutter has closed. */
const ATTEMPT_CUE = 46;
/** The cue the replacement sheet starts to slide in on. */
const INCOMING_CUE = 96;
/** The cue the replacement takes the table's place on. */
const REPLACED_CUE = 112;
/** Frames the shutter takes to reopen after the replacement. */
const OPEN_FRAMES = 26;
/**
 * Committed replacement timing controls rows, readability and shutter state.
 */
export function getQuarantineStateFromFrame({
  frame,
  input,
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): QuarantineState {
  const travel = motion.travel.easing;
  const isReplaced = input.reload.performed && frame >= REPLACED_CUE;
  const rows = isReplaced
    ? input.reload.rows
    : input.originalRows.map((value, index) => {
        return frame >= ATTEMPT_CUE &&
          input.showAttempt &&
          index === input.attempt.rowIndex
          ? input.attempt.replacement
          : value;
      });
  // The shutter is fully closed the frame before the attempt.
  const closing = ramp(frame, CLOSE_CUE, ATTEMPT_CUE - 1 - CLOSE_CUE, travel),
    opening = input.reload.performed
      ? ramp(frame, REPLACED_CUE + 1, motion.scale(OPEN_FRAMES), travel)
      : 0;
  // The replacement slides in until it takes the table's place.
  const arrival = ramp(
    frame,
    INCOMING_CUE,
    REPLACED_CUE - INCOMING_CUE,
    travel,
  );
  const height = 300 * closing * (1 - opening),
    readable = frame < CLOSE_CUE || opening === 1;
  const incoming =
    input.reload.performed && frame >= INCOMING_CUE && frame < REPLACED_CUE;
  return {
    isReplaced,
    rows,
    arrival,
    height,
    readable,
    incoming,
    showReload: input.reload.performed && frame >= INCOMING_CUE,
    showAttempt: frame >= ATTEMPT_CUE && input.showAttempt,
  };
}
