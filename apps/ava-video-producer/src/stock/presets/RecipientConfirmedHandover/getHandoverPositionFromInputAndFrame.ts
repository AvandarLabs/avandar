import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./RecipientConfirmedHandover.schema";
/** Inputs for getHandoverPositionFromInputAndFrame. */
type GetHandoverPositionOptions = {
  input: Input;
  frame: number;
  contentIndex: number;
  unitIndex: number;
  motion: VideoMotion;
};
/**
 * Each chosen unit follows the recipient's one-at-a-time pull across the mat.
 */
export function getHandoverPositionFromInputAndFrame({
  input,
  frame,
  contentIndex,
  unitIndex,
  motion,
}: Readonly<GetHandoverPositionOptions>): {
  x: number;
  y: number;
  travel: number;
} {
  const content = input.contents[contentIndex];
  const ordinal =
    input.contents.slice(0, contentIndex).reduce((sum, item) => {
      return sum + item.selectedUnits;
    }, 0) + unitIndex;
  const travel =
    unitIndex < content.selectedUnits
      ? motion.ramp(
          frame,
          34 + ordinal * motion.scaleStagger(14),
          motion.scale(10),
          motion.travel.easing,
        )
      : 0;
  return {
    x: Motion.mix({
      t: travel,
      from: 205 + unitIndex * 32,
      to: 542 + unitIndex * 32,
    }),
    y: 190 + contentIndex * 80,
    travel,
  };
}
