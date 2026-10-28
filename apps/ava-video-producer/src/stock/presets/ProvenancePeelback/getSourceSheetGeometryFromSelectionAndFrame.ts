import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./ProvenancePeelback.schema";

type Options = {
  index: number;
  otherIndex: number;
  selected: boolean;
  frame: number;
  arrangement: Input["sourceArrangement"];
};
/** Data for getSourceSheetGeometryFromSelectionAndFrame. */
type GetSourceSheetGeometryResult = {
  x: number;
  y: number;
  height: number;
  angle: number;
};

/**
 * Keep the selected source beside the statement and other sheets in context.
 */
export function getSourceSheetGeometryFromSelectionAndFrame({
  index,
  otherIndex,
  selected,
  frame,
  arrangement,
}: Readonly<Options>): GetSourceSheetGeometryResult {
  const peeling = ramp(frame, 40, 64, EASE.inOut);
  return {
    x: mix(peeling, 112 + index * 18, selected ? 496 : 64 + otherIndex * 432),
    y: mix(
      peeling,
      220 + index * 12,
      selected ? 96 : arrangement === "fan" ? 360 : 368,
    ),
    height: selected ? 250 : 220,
    angle:
      !selected && arrangement === "fan" ? (otherIndex ? 2 : -2) * peeling : 0,
  };
}
