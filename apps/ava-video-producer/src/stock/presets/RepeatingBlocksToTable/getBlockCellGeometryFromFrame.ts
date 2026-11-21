import { Motion } from "../../../motion";
import { BLOCK_SLIDE_PLANS } from "./blockSlidePlans";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./RepeatingBlocksToTable.schema";

type Params = {
  input: Input;
  frame: number;
  blockIndex: number;
  fieldIndex: number;
  motion: VideoMotion;
};

type XAndTopOptions = {
  blockIndex: Readonly<Params>["blockIndex"];
  fieldIndex: Readonly<Params>["fieldIndex"];
  compression: number;
};

type XAndTopResult = { x: number; top: number };

type GetBlockCellBoundsOptions = {
  compression: number;
  x: XAndTopResult["x"];
  top: XAndTopResult["top"];
};

type CellGeometry = { x: number; y: number; width: number };

/** Samples a matched slide move without changing its authored endpoints. */
function _getSlidingCellPosition({
  frame,
  motion,
  departure,
  duration,
  move,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
  departure: number;
  duration: number;
  move: readonly number[];
}>): { x: number; top: number } {
  const progress = motion.ramp(
    frame,
    departure,
    duration,
    motion.travel.easing,
  );
  const x = Motion.mix({
    t: progress,
    from: 92 + (move[0] % 4) * 208,
    to: 92 + (move[1] % 4) * 208,
  });
  const top = Motion.mix({
    t: progress,
    from: 240 + Math.floor(move[0] / 4) * 112,
    to: 240 + Math.floor(move[1] / 4) * 112,
  });
  return { x, top };
}

/** Samples the block cell bounds for the current authored frame. */
function _getBlockCellBounds({
  compression,
  x,
  top,
}: Readonly<GetBlockCellBoundsOptions>): {
  x: XAndTopResult["x"];
  y: number;
  width: number;
} {
  return {
    x,
    y: top + 44,
    width: Motion.mix({
      t: compression,
      from: 268,
      to: 192,
    }),
  };
}

/**
 * Samples the block cell geometry from frame xand top for the current authored
 * frame.
 */
function _getBlockCellGeometryFromFrameXAndTop({
  blockIndex,
  fieldIndex,
  compression,
}: Readonly<XAndTopOptions>): XAndTopResult {
  const x = Motion.mix({
      t: compression,
      from: 52 + blockIndex * 294,
      to: 300 + blockIndex * 208,
    }),
    top = Motion.mix({
      t: compression,
      from: 171 + fieldIndex * 112,
      to: 240 + fieldIndex * 112,
    });
  return { x, top };
}

/** Continuous compression and empty-slot slides preserve every full strip. */
export function getBlockCellGeometryFromFrame({
  input,
  frame,
  blockIndex,
  fieldIndex,
  motion,
}: Readonly<Params>): CellGeometry {
  const compression = motion.ramp(
      frame,
      56,
      motion.scale(5),
      motion.travel.easing,
    ),
    token = 1 + blockIndex * input.fields.length + fieldIndex;
  const plan =
      BLOCK_SLIDE_PLANS[`${input.blocks.length}:${input.fields.length}`],
    duration = 35 / plan.length;
  let { x, top } = _getBlockCellGeometryFromFrameXAndTop({
    blockIndex,
    fieldIndex,
    compression,
  });
  plan.forEach((moves, index) => {
    const departure = 61 + index * duration;
    const move = moves.find((candidate) => {
      return candidate[2] === token;
    });
    if (!move || frame < departure) {
      return;
    }
    const position = _getSlidingCellPosition({
      frame,
      motion,
      departure,
      duration,
      move,
    });
    x = position.x;
    top = position.top;
  });
  return _getBlockCellBounds({ compression, x, top });
}
