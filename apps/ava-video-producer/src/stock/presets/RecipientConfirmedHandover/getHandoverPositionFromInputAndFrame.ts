import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./RecipientConfirmedHandover.schema";
/** Inputs for getHandoverPositionFromInputAndFrame. */
type GetHandoverPositionOptions = {
  input: Input;
  frame: number;
  contentIndex: number;
  unitIndex: number;
};

/**
 * Each chosen unit follows the recipient's one-at-a-time pull across the mat.
 */
export function getHandoverPositionFromInputAndFrame({
  input,
  frame,
  contentIndex,
  unitIndex,
}: Readonly<GetHandoverPositionOptions>): {
  x: number;
  y: number;
  travel: number;
} {
  const content = input.contents[contentIndex];
  const ordinal =
    input.contents
      .slice(0, contentIndex)
      .reduce((sum, item) => sum + item.selectedUnits, 0) + unitIndex;
  const travel =
    unitIndex < content.selectedUnits
      ? ramp(frame, 34 + ordinal * 14, 10, EASE.inOut)
      : 0;
  return {
    x: mix(travel, 205 + unitIndex * 32, 542 + unitIndex * 32),
    y: 190 + contentIndex * 80,
    travel,
  };
}
