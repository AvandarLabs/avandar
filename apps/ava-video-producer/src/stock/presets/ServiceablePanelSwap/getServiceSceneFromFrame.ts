import { EASE, mix, ramp } from "../../../motion";
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
}: Readonly<{ frame: number; input: Input }>): GetServiceSceneFromFrameResult {
  const targetIndex = input.modules.findIndex(
    ({ id }) => id === input.replacement.targetModuleId,
  );
  const slotX = 180 + targetIndex * 170;
  const original = {
    x: mix(ramp(frame, 86, 8, EASE.inOut), slotX, 60),
    y: mix(ramp(frame, 79, 7, EASE.inOut), 235, 430),
  };
  const replacement = {
    x: mix(ramp(frame, 95, 8, EASE.inOut), 750, slotX),
    y: mix(ramp(frame, 103, 7, EASE.inOut), 430, 235),
  };
  const latchOpen =
    ramp(frame, 43, 35, EASE.inOut) * (1 - ramp(frame, 110, 6, EASE.inOut));
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
