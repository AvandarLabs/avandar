import { ramp, mix, EASE } from "../../../motion";
import { getMaterialEndpointsFromInput } from "./getMaterialEndpointsFromInput";
import type { Input } from "./ComponentMaterialReturn.schema";
/** Data for getMaterialPlacementFromInputAndFrame. */
type GetMaterialPlacementResult = {
  x: number;
  y: number;
  destination: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  start: number;
};

/**
 * A lifted whole component travels above unchanged neighbors before landing.
 */
export function getMaterialPlacementFromInputAndFrame({
  input,
  index,
  frame,
}: Readonly<{
  input: Input;
  index: number;
  frame: number;
}>): GetMaterialPlacementResult {
  const { source, target, destination } = getMaterialEndpointsFromInput({
    input,
    index,
  });
  const start = 36 + index * 8;
  const lift = ramp(frame, start + 1, 2, EASE.inOut);
  const travel = ramp(frame, start + 3, 3, EASE.inOut);
  const land = ramp(frame, start + 6, 2, EASE.inOut);
  return {
    x: mix(travel, source.x, target.x),
    y: frame < start + 6 ? mix(lift, source.y, 265) : mix(land, 265, target.y),
    destination,
    source,
    target,
    start,
  };
}
