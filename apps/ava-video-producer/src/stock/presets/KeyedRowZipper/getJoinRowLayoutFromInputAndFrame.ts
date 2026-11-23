import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./KeyedRowZipper.schema";

type Options = {
  input: Input;
  frame: number;
  side: "left" | "right";
  row: Input["leftRows"][number];
  index: number;
  motion: VideoMotion;
};
/** Data for getJoinRowLayoutFromInputAndFrame. */
type GetJoinRowLayoutResult = {
  isContext: boolean;
  x: number;
  y: number;
  height: number;
  progress: number;
};
/** Frames the rows take to travel into the result or the tray. */
const ZIP_FRAMES = 66;
/** Original-order result membership and bounded source-to-tray travel. */
export function getJoinRowLayoutFromInputAndFrame({
  input,
  frame,
  side,
  row,
  index,
  motion,
}: Readonly<Options>): GetJoinRowLayoutResult {
  const results = input.leftRows.filter((left) => {
    return (
      input.joinType === "left" || input.rightRows.some(propEq("key", left.key))
    );
  });
  const resultIndex = results.findIndex(propEq("key", row.key));
  const isContext = resultIndex < 0;
  const sourceRows = side === "left" ? input.leftRows : input.rightRows;
  const contexts = sourceRows.filter((candidate) => {
    return !results.some(propEq("key", candidate.key));
  });
  const targetY = isContext
    ? 450 + contexts.findIndex(propEq("key", row.key)) * 44
    : 154 + resultIndex * 66;
  const progress = Motion.ramp({
    frame,
    at: 42,
    dur: motion.scale(ZIP_FRAMES),
    easing: motion.travel.easing,
  });
  return {
    isContext,
    x: Motion.mix({
      t: progress,
      from: side === "left" ? 44 : 500,
      to: side === "left" ? 64 : 480,
    }),
    y: Motion.mix({ t: progress, from: 154 + index * 66, to: targetY }),
    height: Motion.mix({ t: progress, from: 60, to: isContext ? 40 : 60 }),
    progress,
  };
}
