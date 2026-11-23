import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ServiceablePanelSwap.schema";
/** Data for getServiceSceneFromFrame. */
type GetServiceSceneFromFrameResult = {
  targetIndex: number;
  slotX: number;
  original: {
    x: number;
    y: number;
  };
  replacement: {
    x: number;
    y: number;
  };
  latchOpen: number;
  hand: {
    x: number;
    y: number;
  };
};
type ServiceSceneArgs = Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>;
type Point = {
  x: number;
  y: number;
};
/**
 * The hand on the latch, then carrying the original out and the
 * replacement in, then back on the latch.
 */
function _getServiceHand({
  frame,
  input: { slotX, latchOpen, original, replacement },
}: Readonly<{
  frame: number;
  input: Readonly<{
    slotX: number;
    latchOpen: number;
    original: Point;
    replacement: Point;
  }>;
}>): Point {
  return frame < 79
    ? { x: slotX + 136, y: 223 - 38 * latchOpen }
    : frame < 95
      ? { x: original.x + 136, y: original.y }
      : frame < 111
        ? { x: replacement.x + 136, y: replacement.y }
        : { x: slotX + 136, y: 223 - 38 * latchOpen };
}
/** One fixed slot owns the latch, connector and complete replacement action. */
export function getServiceSceneFromFrame({
  frame,
  input,
  motion,
}: ServiceSceneArgs): GetServiceSceneFromFrameResult {
  const targetIndex = input.modules.findIndex(
    propEq("id", input.replacement.targetModuleId),
  );
  const slotX = 180 + targetIndex * 170;
  const original = {
    x: Motion.mix({
      t: motion.ramp(frame, 86, motion.whip, motion.travel.easing),
      from: slotX,
      to: 60,
    }),
    y: Motion.mix({
      t: motion.ramp(frame, 79, motion.scale(7), motion.travel.easing),
      from: 235,
      to: 430,
    }),
  };
  const replacement = {
    x: Motion.mix({
      t: motion.ramp(frame, 95, motion.whip, motion.travel.easing),
      from: 750,
      to: slotX,
    }),
    y: Motion.mix({
      t: motion.ramp(frame, 103, motion.scale(7), motion.travel.easing),
      from: 430,
      to: 235,
    }),
  };
  const latchOpen =
    motion.ramp(frame, 43, motion.scale(35), motion.travel.easing) *
    (1 - motion.ramp(frame, 110, motion.chip, motion.travel.easing));
  const hand = _getServiceHand({
    frame,
    input: { slotX, latchOpen, original, replacement },
  });
  return { targetIndex, slotX, original, replacement, latchOpen, hand };
}
