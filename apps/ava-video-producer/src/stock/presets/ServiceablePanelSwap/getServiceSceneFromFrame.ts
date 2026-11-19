import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ServiceablePanelSwap.schema";
/** Data for getServiceSceneFromFrame. */
type GetServiceSceneFromFrameResult = {
  targetIndex: number;
  slotX: number;
  original: { x: number; y: number };
  replacement: { x: number; y: number };
  latchOpen: number;
  hand: { x: number; y: number };
};

/** One fixed slot owns the latch, connector and complete replacement action. */
export function getServiceSceneFromFrame({
  frame,
  input,
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): GetServiceSceneFromFrameResult {
  const targetIndex = input.modules.findIndex(({ id }) => {
    return id === input.replacement.targetModuleId;
  });
  const slotX = 180 + targetIndex * 170;
  const original = {
    x: mix(
      motion.ramp(frame, 86, motion.whip, motion.travel.easing),
      slotX,
      60,
    ),
    y: mix(
      motion.ramp(frame, 79, motion.scale(7), motion.travel.easing),
      235,
      430,
    ),
  };
  const replacement = {
    x: mix(
      motion.ramp(frame, 95, motion.whip, motion.travel.easing),
      750,
      slotX,
    ),
    y: mix(
      motion.ramp(frame, 103, motion.scale(7), motion.travel.easing),
      430,
      235,
    ),
  };
  const latchOpen =
    motion.ramp(frame, 43, motion.scale(35), motion.travel.easing) *
    (1 - motion.ramp(frame, 110, motion.chip, motion.travel.easing));
  const hand =
    frame < 79
      ? { x: slotX + 136, y: 223 - 38 * latchOpen }
      : frame < 95
        ? { x: original.x + 136, y: original.y }
        : frame < 111
          ? { x: replacement.x + 136, y: replacement.y }
          : { x: slotX + 136, y: 223 - 38 * latchOpen };
  return { targetIndex, slotX, original, replacement, latchOpen, hand };
}
