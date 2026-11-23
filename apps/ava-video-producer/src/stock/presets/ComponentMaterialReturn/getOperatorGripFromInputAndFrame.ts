import { Motion } from "../../../motion";
import { getMaterialItemsFromInput } from "./getMaterialItemsFromInput";
import { getMaterialPlacementFromInputAndFrame } from "./getMaterialPlacementFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ComponentMaterialReturn.schema";

type PointOptions = {
  input: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["input"];
  frame: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
  index: number;
};

type PointResult = {
  point: ReturnType<typeof getMaterialPlacementFromInputAndFrame>;
  prior:
    | ReturnType<typeof getMaterialPlacementFromInputAndFrame>["target"]
    | { x: number; y: number };
  withdraw: ReturnType<typeof _getGripPhases>["withdraw"];
  approach: ReturnType<typeof _getGripPhases>["approach"];
  x: number | ReturnType<typeof getMaterialPlacementFromInputAndFrame>["x"];
};

/** The empty hand's lift clear, traverse, and approach, each 0 to 1. */
function _getGripPhases({
  frame,
  start,
  motion,
}: Readonly<{
  frame: number;
  start: number;
  motion: VideoMotion;
}>) {
  const phase = (offset: number, length: number) => {
    return motion.ramp(
      frame,
      start + offset,
      motion.scale(length),
      motion.travel.easing,
    );
  };
  return {
    withdraw: phase(0, 0.3),
    traverse: phase(0.3, 0.4),
    approach: phase(0.7, 0.3),
  };
}

/**
 * Samples the operator grip from input and frame point state for the current
 * authored frame.
 */
function _getOperatorGripFromInputAndFramePointState({
  input,
  frame,
  motion,
  index,
}: Readonly<PointOptions>): PointResult {
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
  const { withdraw, traverse, approach } = _getGripPhases({
    frame,
    start: point.start,
    motion,
  });
  const x =
    frame < point.start + 1
      ? Motion.mix({
          t: traverse,
          from: prior.x,
          to: point.source.x,
        })
      : point.x;
  return { point, prior, withdraw, approach, x };
}

/** Empty travel lifts clear before the hand approaches the next source. */
export function getOperatorGripFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>): {
  x: number;
  y: number;
  index: number;
} {
  const items = getMaterialItemsFromInput(input);
  const index = Math.max(
    0,
    Math.min(items.length - 1, Math.floor((frame - 36) / 8)),
  );
  const { point, prior, withdraw, approach, x } =
    _getOperatorGripFromInputAndFramePointState({
      input,
      frame,
      motion,
      index,
    });
  const y =
    frame < point.start + 0.7
      ? Motion.mix({
          t: withdraw,
          from: prior.y,
          to: 265,
        })
      : frame < point.start + 1
        ? Motion.mix({
            t: approach,
            from: 265,
            to: point.source.y,
          })
        : point.y;
  return { x, y, index };
}
