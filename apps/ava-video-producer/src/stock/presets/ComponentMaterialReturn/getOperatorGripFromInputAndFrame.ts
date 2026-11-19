import { mix } from "../../../motion";
import { getMaterialItemsFromInput } from "./getMaterialItemsFromInput";
import { getMaterialPlacementFromInputAndFrame } from "./getMaterialPlacementFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ComponentMaterialReturn.schema";
/** Empty travel lifts clear before the hand approaches the next source. */
export function getOperatorGripFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{ input: Input; frame: number; motion: VideoMotion }>): {
  x: number;
  y: number;
  index: number;
} {
  const items = getMaterialItemsFromInput(input);
  const index = Math.max(
    0,
    Math.min(items.length - 1, Math.floor((frame - 36) / 8)),
  );
  const point = getMaterialPlacementFromInputAndFrame({
    motion,
    input,
    index,
    frame,
  });
  const prior = index
    ? getMaterialPlacementFromInputAndFrame({
        motion,
        input,
        index: index - 1,
        frame: 150,
      }).target
    : { x: 340, y: 265 };
  const withdraw = motion.ramp(
    frame,
    point.start,
    motion.scale(0.3),
    motion.travel.easing,
  );
  const traverse = motion.ramp(
    frame,
    point.start + 0.3,
    motion.scale(0.4),
    motion.travel.easing,
  );
  const approach = motion.ramp(
    frame,
    point.start + 0.7,
    motion.scale(0.3),
    motion.travel.easing,
  );
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
