import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./InvalidTableQuarantine.schema";
/** Inputs for getQuarantineStateFromFrame. */
type GetQuarantineStateFromFrameArguments = {
  frame: number;
  input: Input;
  motion: VideoMotion;
};

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

/** Retains the source rows until a committed reload takes their place. */
function _getCommittedRowsFromFrame({
  input,
  isReplaced,
  frame,
}: Readonly<GetCommittedRowsFromFrameOptions>): Input["originalRows"] {
  return isReplaced
    ? input.reload.rows
    : input.originalRows.map((value, index) => {
        return frame >= ATTEMPT_CUE &&
          input.showAttempt &&
          index === input.attempt.rowIndex
          ? input.attempt.replacement
          : value;
      });
}

/**
 * Committed replacement timing controls rows, readability and shutter state.
 */
export function getQuarantineStateFromFrame({
  frame,
  input,
  motion,
}: Readonly<GetQuarantineStateFromFrameArguments>): QuarantineState {
  const travel = motion.travel.easing;
  const isReplaced = input.reload.performed && frame >= REPLACED_CUE;
  const rows = _getCommittedRowsFromFrame({ input, isReplaced, frame });
  // The shutter is fully closed the frame before the attempt.
  const closing = Motion.ramp({
      frame,
      at: CLOSE_CUE,
      dur: ATTEMPT_CUE - 1 - CLOSE_CUE,
      easing: travel,
    }),
    opening = input.reload.performed
      ? Motion.ramp({
          frame,
          at: REPLACED_CUE + 1,
          dur: motion.scale(OPEN_FRAMES),
          easing: travel,
        })
      : 0;
  // The replacement slides in until it takes the table's place.
  const arrival = Motion.ramp({
    frame,
    at: INCOMING_CUE,
    dur: REPLACED_CUE - INCOMING_CUE,
    easing: travel,
  });
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

type GetCommittedRowsFromFrameOptions = {
  input: Input;
  isReplaced: boolean;
  frame: number;
};
