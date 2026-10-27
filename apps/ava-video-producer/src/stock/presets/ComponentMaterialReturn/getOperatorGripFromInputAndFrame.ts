import { ramp, mix, EASE } from "../../../motion";
import { getMaterialItemsFromInput } from "./getMaterialItemsFromInput";
import { getMaterialPlacementFromInputAndFrame } from "./getMaterialPlacementFromInputAndFrame";
import type { Input } from "./ComponentMaterialReturn.schema";
/** Empty travel lifts clear before the hand approaches the next source. */
export function getOperatorGripFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): {
  x: number;
  y: number;
  index: number;
} {
  const items = getMaterialItemsFromInput(input);
  const index = Math.max(
    0,
    Math.min(items.length - 1, Math.floor((frame - 36) / 8)),
  );
  const point = getMaterialPlacementFromInputAndFrame({ input, index, frame });
  const prior = index
    ? getMaterialPlacementFromInputAndFrame({
        input,
        index: index - 1,
        frame: 150,
      }).target
    : { x: 340, y: 265 };
  const withdraw = ramp(frame, point.start, 0.3, EASE.inOut);
  const traverse = ramp(frame, point.start + 0.3, 0.4, EASE.inOut);
  const approach = ramp(frame, point.start + 0.7, 0.3, EASE.inOut);
  const x =
    frame < point.start + 1 ? mix(traverse, prior.x, point.source.x) : point.x;
  const y =
    frame < point.start + 0.7
      ? mix(withdraw, prior.y, 265)
      : frame < point.start + 1
        ? mix(approach, 265, point.source.y)
        : point.y;
  return { x, y, index };
}
