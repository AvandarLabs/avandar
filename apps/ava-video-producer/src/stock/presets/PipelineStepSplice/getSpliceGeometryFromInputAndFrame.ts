import { prop } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { getSeparationFromFrame } from "./spliceTiming";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./PipelineStepSplice.schema";
/** Data for getSpliceGeometryFromInputAndFrame. */
type GetSpliceGeometryResult = {
  id: string;
  label: string;
  isInserted: boolean;
  x: number;
  y: number;
};

/** Frames the inserted step takes to drop into the gap. */
const INSERT_FRAMES = 36;

/** Final-array identities retain their order through a single middle splice. */
export function getSpliceGeometryFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>): GetSpliceGeometryResult[] {
  const separation = getSeparationFromFrame(frame, motion);
  const insertion = ramp(
    frame,
    62,
    motion.scale(INSERT_FRAMES),
    motion.travel.easing,
  );
  const insertedIndex = input.steps.findIndex(prop("isInserted"));
  const numSteps = input.steps.length;
  return input.steps.map((step, index) => {
    const finalX = (960 - ((numSteps - 1) * 170 + 140)) / 2 + index * 170;
    const originalIndex = index < insertedIndex ? index : index - 1;
    const originalX =
      (960 - ((numSteps - 2) * 170 + 140)) / 2 + originalIndex * 170;
    return {
      ...step,
      x: step.isInserted ? finalX : mix(separation, originalX, finalX),
      y: step.isInserted ? mix(insertion, 154, 290) : 290,
    };
  });
}
