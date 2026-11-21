import { Motion } from "../../../motion";
import { getMaterialEndpointsFromInput } from "./getMaterialEndpointsFromInput";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ComponentMaterialReturn.schema";

/** Data for getMaterialPlacementFromInputAndFrame. */
type GetMaterialPlacementResult = {
  x: number;
  y: number;
  destination: string;
  source: {
    x: number;
    y: number;
  };
  target: {
    x: number;
    y: number;
  };
  start: number;
};

type SourceOptions = {
  input: Readonly<{
    input: Input;
    index: number;
    frame: number;
    motion: VideoMotion;
  }>["input"];
  index: Readonly<{
    input: Input;
    index: number;
    frame: number;
    motion: VideoMotion;
  }>["index"];
  frame: Readonly<{
    input: Input;
    index: number;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    index: number;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type SourceResult = {
  source: ReturnType<typeof getMaterialEndpointsFromInput>["source"];
  target: ReturnType<typeof getMaterialEndpointsFromInput>["target"];
  destination: ReturnType<typeof getMaterialEndpointsFromInput>["destination"];
  start: number;
  lift: number;
  travel: number;
  land: number;
};

/**
 * Samples the material placement from input and frame source state for the
 * current authored frame.
 */
function _getMaterialPlacementFromInputAndFrameSourceState({
  input,
  index,
  frame,
  motion,
}: Readonly<SourceOptions>): SourceResult {
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
  return { source, target, destination, start, lift, travel, land };
}

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
  const { source, target, destination, start, lift, travel, land } =
    _getMaterialPlacementFromInputAndFrameSourceState({
      input,
      index,
      frame,
      motion,
    });
  return {
    x: Motion.mix({
      t: travel,
      from: source.x,
      to: target.x,
    }),
    y:
      frame < start + 6
        ? Motion.mix({
            t: lift,
            from: source.y,
            to: 265,
          })
        : Motion.mix({
            t: land,
            from: 265,
            to: target.y,
          }),
    destination,
    source,
    target,
    start,
  };
}
