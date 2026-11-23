import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PredicatePushdownBoundary.schema";

/** Values needed to derive this visual's layout and appearance. */
type Options = { frame: number; input: Input; accent: string };
const TRAVEL_CUE = 96;
const TRAVEL_FRAMES = 28;
const SETTLE_CUE = 124;
const SETTLE_FRAMES = 15;
/** The authored rows that satisfy the predicate, in authored order. */
function _matchingRows(input: Input): Input["rows"] {
  return input.rows.filter((row) => {
    return input.predicate.operator === ">="
      ? row.value >= input.predicate.threshold
      : row.value <= input.predicate.threshold;
  });
}

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  matches: Array<{ id: string; value: number }>;
  matchedRows: Set<{ id: string; value: number }>;
  travel: number;
  settle: number;
};

/**
 * Returns matching rows, travel progress, and settle progress for
 * `MatchingPushdownRow`, `PushdownRows`.
 */
export function usePushdownRowsPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const matches = _matchingRows(input);
  const matchedRows = new Set(matches);
  const travel = Motion.ramp({
    frame,
    at: TRAVEL_CUE,
    dur: motion.scale(TRAVEL_FRAMES),
    easing: motion.travel.easing,
  });
  const settle = Motion.ramp({
    frame,
    at: SETTLE_CUE,
    dur: motion.scale(SETTLE_FRAMES),
    easing: motion.travel.easing,
  });
  return { frame, input, accent, motion, matches, matchedRows, travel, settle };
}
