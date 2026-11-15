import { mix, ramp } from "../../../motion";
import { getHandoverPositionFromInputAndFrame } from "./getHandoverPositionFromInputAndFrame";
import type { Input } from "./RecipientConfirmedHandover.schema";
/** Data for getRecipientPoseFromInputAndFrame. */
type GetRecipientPoseResult = {
  x: number;
  y: number;
  handX: number;
  handY: number;
};

function _getSelections(input: Input) {
  return input.contents.flatMap((content, contentIndex) =>
    Array.from({ length: content.selectedUnits }, (_, unitIndex) => ({
      contentIndex,
      unitIndex,
    })),
  );
}

/**
 * The recipient walks the counting mat, grips a chosen unit, then withdraws.
 */
export function getRecipientPoseFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): GetRecipientPoseResult {
  const selections = _getSelections(input);
  const ordinal = Math.max(
    0,
    Math.min(selections.length - 1, Math.floor((frame - 30) / 14)),
  );
  const product = getHandoverPositionFromInputAndFrame({
    input,
    frame,
    ...selections[ordinal],
  });
  const previous =
    ordinal === 0
      ? { x: 362, y: 105 }
      : getHandoverPositionFromInputAndFrame({
          input,
          frame: 150,
          ...selections[ordinal - 1],
        });
  const start = 30 + ordinal * 14;
  const approach = ramp(
    frame,
    start + (ordinal === 0 ? 0 : 1),
    ordinal === 0 ? 4 : 3,
  );
  const waypoint = Math.min(1, approach * 3);
  const vertical = Math.max(0, Math.min(1, approach * 3 - 1));
  const finalReach = Math.max(0, approach * 3 - 2);
  const x = mix(
    finalReach,
    mix(waypoint, previous.x + 38, 480),
    product.x + 38,
  );
  const y = mix(vertical, previous.y + 35, product.y + 35);
  const release = ramp(frame, 30 + selections.length * 14, 4);
  const grip = finalReach * (1 - release);
  const handX = mix(grip, x - 12, product.x + 12);
  const handY = mix(grip, y + 8, product.y);
  const withdraw = ordinal === 0 ? 1 : ramp(frame, start, 1);
  return {
    x,
    y,
    handX: mix(withdraw, previous.x + 12, handX),
    handY: mix(withdraw, previous.y, handY),
  };
}
