import { EASE, mix, ramp } from "../../../motion";
import { BLOCK_SLIDE_PLANS } from "./blockSlidePlans";
import type { Input } from "./RepeatingBlocksToTable.schema";
type Params = {
  input: Input;
  frame: number;
  blockIndex: number;
  fieldIndex: number;
};
/** Continuous compression and empty-slot slides preserve every full strip. */
export function getBlockCellGeometryFromFrame({
  input,
  frame,
  blockIndex,
  fieldIndex,
}: Readonly<Params>): { x: number; y: number; width: number } {
  const compression = ramp(frame, 56, 5, EASE.inOut),
    token = 1 + blockIndex * input.fields.length + fieldIndex;
  const plan =
      BLOCK_SLIDE_PLANS[`${input.blocks.length}:${input.fields.length}`],
    duration = 35 / plan.length;
  let x = mix(compression, 52 + blockIndex * 294, 300 + blockIndex * 208),
    top = mix(compression, 171 + fieldIndex * 112, 240 + fieldIndex * 112);
  plan.forEach((moves, index) => {
    const departure = 61 + index * duration;
    const move = moves.find((candidate) => candidate[2] === token);
    if (!move || frame < departure) {
      return;
    }
    const progress = ramp(frame, departure, duration, EASE.inOut);
    x = mix(progress, 92 + (move[0] % 4) * 208, 92 + (move[1] % 4) * 208);
    top = mix(
      progress,
      240 + Math.floor(move[0] / 4) * 112,
      240 + Math.floor(move[1] / 4) * 112,
    );
  });
  return { x, y: top + 44, width: mix(compression, 268, 192) };
}
