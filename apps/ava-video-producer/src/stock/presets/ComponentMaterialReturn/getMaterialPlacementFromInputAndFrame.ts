import { mix } from "../../../motion";
import { getMaterialEndpointsFromInput } from "./getMaterialEndpointsFromInput";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  motion,
}: Readonly<{
  input: Input;
  index: number;
  frame: number;
  motion: VideoMotion;
}>): GetMaterialPlacementResult {
  const { source, target, destination } = getMaterialEndpointsFromInput({
    input,
    index,
  });
  const start = 36 + index * 8;
  const lift = motion.ramp(
    frame,
    start + 1,
    motion.scale(2),
    motion.travel.easing,
  );
  const travel = motion.ramp(
    frame,
    start + 3,
    motion.scale(3),
    motion.travel.easing,
  );
  const land = motion.ramp(
    frame,
    start + 6,
    motion.scale(2),
    motion.travel.easing,
  );
  return {
    x: mix(travel, source.x, target.x),
    y: frame < start + 6 ? mix(lift, source.y, 265) : mix(land, 265, target.y),
    destination,
    source,
    target,
    start,
  };
}
