import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import {
  HIGHLIGHT_CUE,
  HIGHLIGHT_STEP,
  HIGHLIGHT_FRAMES,
} from "./CodeFocus.constants";

/** Supplies CodeFocus with frame-specific rendering geometry or progress. */
export function useHighlightLine({
  highlight,
  frame,
}: Readonly<{
  highlight: readonly number[];
  frame: number;
}>): number {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return highlight.slice(1).reduce((offset, lineIndex, index) => {
    return (
      offset +
      Motion.ramp({
        frame,
        at: HIGHLIGHT_CUE + index * HIGHLIGHT_STEP,
        dur: motion.scale(HIGHLIGHT_FRAMES),
        easing: motion.travel.easing,
      }) *
        (lineIndex - highlight[index])
    );
  }, highlight[0]);
}
