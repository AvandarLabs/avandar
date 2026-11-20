import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import { getSentenceGlyphsFromInput } from "./getSentenceGlyphsFromInput";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ProseMeasurementLedger.schema";

const ROLES: readonly [
  "subject",
  "metric",
  "value",
  "unit",
  "period",
  "qualifier",
] = ["subject", "metric", "value", "unit", "period", "qualifier"] as const;
/** Data for getObservationSlotFromFrame. */
type GetObservationSlotFromFrameResult = {
  role: "value" | "unit" | "qualifier" | "metric" | "period" | "subject";
  progress: number;
  slotX: number;
  slotY: number;
  departure: number;
  opacity: number;
  captionOpacity: number;
  movingCaptionOpacity: number;
  x: number;
  y: number;
  value: string;
};

type ObservationSlotArgs = Readonly<{
  input: Input;
  frame: number;
  index: number;
  motion: VideoMotion;
}>;

/**
 * Exact derived text travels through a clear rail before its destination
 * column.
 */
export function getObservationSlotFromFrame({
  input,
  frame,
  index,
  motion,
}: ObservationSlotArgs): GetObservationSlotFromFrameResult {
  const role = ROLES[index],
    fragment = input.fragments.find(propEq("role", role))!;
  const origin = _findFragmentOrigin(input, fragment);
  const departure = 56 + ((index + 3) % 6) * 8.5;
  const { progress, alignment, descent } = _getTravelPhases(
    frame,
    departure,
    motion,
  );
  const slotX = 52 + (index % 3) * 294,
    slotY = 315 + Math.floor(index / 3) * 110;
  return {
    role,
    progress,
    slotX,
    slotY,
    departure,
    opacity: motion.ramp(frame, departure, motion.scale(1)),
    captionOpacity: motion.ramp(frame, departure + 8, motion.scale(2)),
    movingCaptionOpacity:
      1 - motion.ramp(frame, departure + 7, motion.scale(1)),
    x: mix(alignment, Math.min(origin.x, 664), slotX + 12),
    y: mix(descent, 238, slotY + 49),
    value: fragment.text
      .slice(fragment.contentStart, fragment.contentEnd)
      .trim(),
  };
}

/** The sentence glyph where a fragment's content starts. */
function _findFragmentOrigin(
  input: Input,
  fragment: Input["fragments"][number],
) {
  const fragmentIndex = input.fragments.indexOf(fragment),
    start =
      input.fragments.slice(0, fragmentIndex).reduce((total, item) => {
        return total + item.text.length;
      }, 0) + fragment.contentStart;
  return getSentenceGlyphsFromInput(input).find((glyph) => {
    return glyph.end > start;
  })!;
}

/** The fragment's overall travel, its alignment, and its descent, 0 to 1. */
function _getTravelPhases(
  frame: number,
  departure: number,
  motion: VideoMotion,
) {
  return {
    progress: motion.ramp(frame, departure, motion.whip, motion.travel.easing),
    alignment: motion.ramp(
      frame,
      departure,
      motion.scale(3),
      motion.travel.easing,
    ),
    descent: motion.ramp(
      frame,
      departure + 3,
      motion.scale(5),
      motion.travel.easing,
    ),
  };
}
