import { Motion } from "../../../motion";
import { getHandoverPositionFromInputAndFrame } from "./getHandoverPositionFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./RecipientConfirmedHandover.schema";

/** Data for getRecipientPoseFromInputAndFrame. */
type GetRecipientPoseResult = {
  x: number;
  y: number;
  handX: number;
  handY: number;
};

type SelectionsOptions = {
  input: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["input"];
  frame: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type SelectionsResult = {
  selections: ReturnType<typeof _getSelections>;
  ordinal: number;
  product: ReturnType<typeof getHandoverPositionFromInputAndFrame>;
  previous:
    | { x: number; y: number }
    | ReturnType<typeof getHandoverPositionFromInputAndFrame>;
  start: number;
  approach: number;
  waypoint: number;
  vertical: number;
};

type GetRecipientApproachPoseOptions = {
  input: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["input"];
  frame: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type GetRecipientApproachPoseResult = {
  selections: SelectionsResult["selections"];
  ordinal: SelectionsResult["ordinal"];
  product: SelectionsResult["product"];
  previous: SelectionsResult["previous"];
  start: SelectionsResult["start"];
  finalReach: number;
  x: number;
  y: number;
};

type PreviousOptions = {
  input: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["input"];
  frame: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type PreviousResult = {
  previous: GetRecipientApproachPoseResult["previous"];
  x: GetRecipientApproachPoseResult["x"];
  y: GetRecipientApproachPoseResult["y"];
  handX: number;
  handY: number;
  withdraw: number;
};

function _getSelections(input: Input) {
  return input.contents.flatMap((content, contentIndex) => {
    return Array.from({ length: content.selectedUnits }, (_, unitIndex) => {
      return {
        contentIndex,
        unitIndex,
      };
    });
  });
}

/**
 * Samples the recipient pose from input and frame selections state for the
 * current authored frame.
 */
function _getRecipientPoseFromInputAndFrameSelectionsState({
  input,
  frame,
  motion,
}: Readonly<SelectionsOptions>): SelectionsResult {
  const selections = _getSelections(input);
  const ordinal = Math.max(
    0,
    Math.min(selections.length - 1, Math.floor((frame - 30) / 14)),
  );
  const product = getHandoverPositionFromInputAndFrame({
    input,
    frame,
    ...selections[ordinal],
    motion,
  });
  const previous =
    ordinal === 0
      ? { x: 362, y: 105 }
      : getHandoverPositionFromInputAndFrame({
          input,
          frame: 150,
          ...selections[ordinal - 1],
          motion,
        });
  const start = 30 + ordinal * motion.scaleStagger(14);
  const approach = motion.ramp(
    frame,
    start + (ordinal === 0 ? 0 : 1),
    motion.scale(ordinal === 0 ? 4 : 3),
    motion.entrance.easing,
  );
  const waypoint = Math.min(1, approach * 3);
  const vertical = Math.max(0, Math.min(1, approach * 3 - 1));
  return {
    selections,
    ordinal,
    product,
    previous,
    start,
    approach,
    waypoint,
    vertical,
  };
}

/** Samples the recipient approach pose for the current authored frame. */
function _getRecipientApproachPose({
  input,
  frame,
  motion,
}: Readonly<GetRecipientApproachPoseOptions>): GetRecipientApproachPoseResult {
  const {
    selections,
    ordinal,
    product,
    previous,
    start,
    approach,
    waypoint,
    vertical,
  } = _getRecipientPoseFromInputAndFrameSelectionsState({
    input,
    frame,
    motion,
  });
  const finalReach = Math.max(0, approach * 3 - 2);
  const x = Motion.mix({
    t: finalReach,
    from: Motion.mix({
      t: waypoint,
      from: previous.x + 38,
      to: 480,
    }),
    to: product.x + 38,
  });
  const y = Motion.mix({
    t: vertical,
    from: previous.y + 35,
    to: product.y + 35,
  });
  return { selections, ordinal, product, previous, start, finalReach, x, y };
}

/**
 * Samples the recipient pose from input and frame previous state for the
 * current authored frame.
 */
function _getRecipientPoseFromInputAndFramePreviousState({
  input,
  frame,
  motion,
}: Readonly<PreviousOptions>): PreviousResult {
  const { selections, ordinal, product, previous, start, finalReach, x, y } =
    _getRecipientApproachPose({
      input,
      frame,
      motion,
    });
  const release = motion.ramp(
    frame,
    30 + selections.length * motion.scaleStagger(14),
    motion.press.duration,
    motion.entrance.easing,
  );
  const grip = finalReach * (1 - release);
  const handX = Motion.mix({
    t: grip,
    from: x - 12,
    to: product.x + 12,
  });
  const handY = Motion.mix({
    t: grip,
    from: y + 8,
    to: product.y,
  });
  const withdraw =
    ordinal === 0
      ? 1
      : motion.ramp(frame, start, motion.scale(1), motion.entrance.easing);
  return { previous, x, y, handX, handY, withdraw };
}

/**
 * The recipient walks the counting mat, grips a chosen unit, then withdraws.
 */
export function getRecipientPoseFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>): GetRecipientPoseResult {
  const { previous, x, y, handX, handY, withdraw } =
    _getRecipientPoseFromInputAndFramePreviousState({ input, frame, motion });
  return {
    x,
    y,
    handX: Motion.mix({
      t: withdraw,
      from: previous.x + 12,
      to: handX,
    }),
    handY: Motion.mix({
      t: withdraw,
      from: previous.y,
      to: handY,
    }),
  };
}
