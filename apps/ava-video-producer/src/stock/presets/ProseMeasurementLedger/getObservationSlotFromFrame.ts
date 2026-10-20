import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { getSentenceGlyphsFromInput } from "./getSentenceGlyphsFromInput";
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

/**
 * Exact derived text travels through a clear rail before its destination
 * column.
 */
export function getObservationSlotFromFrame({
  input,
  frame,
  index,
}: Readonly<{
  input: Input;
  frame: number;
  index: number;
}>): GetObservationSlotFromFrameResult {
  const role = ROLES[index],
    fragment = input.fragments.find(propEq("role", role))!;
  const fragmentIndex = input.fragments.indexOf(fragment),
    start =
      input.fragments
        .slice(0, fragmentIndex)
        .reduce((total, item) => total + item.text.length, 0) +
      fragment.contentStart;
  const origin = getSentenceGlyphsFromInput(input).find(
    (glyph) => glyph.end > start,
  )!;
  const departure = 56 + ((index + 3) % 6) * 8.5;
  const progress = ramp(frame, departure, 8, EASE.inOut),
    alignment = ramp(frame, departure, 3, EASE.inOut),
    descent = ramp(frame, departure + 3, 5, EASE.inOut);
  const slotX = 52 + (index % 3) * 294,
    slotY = 315 + Math.floor(index / 3) * 110;
  return {
    role,
    progress,
    slotX,
    slotY,
    departure,
    opacity: ramp(frame, departure, 1),
    captionOpacity: ramp(frame, departure + 8, 2),
    movingCaptionOpacity: 1 - ramp(frame, departure + 7, 1),
    x: mix(alignment, Math.min(origin.x, 664), slotX + 12),
    y: mix(descent, 238, slotY + 49),
    value: fragment.text
      .slice(fragment.contentStart, fragment.contentEnd)
      .trim(),
  };
}
