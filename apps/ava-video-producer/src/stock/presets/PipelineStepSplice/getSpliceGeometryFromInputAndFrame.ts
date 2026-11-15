import { prop } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./PipelineStepSplice.schema";
/** Data for getSpliceGeometryFromInputAndFrame. */
type GetSpliceGeometryResult = {
  id: string;
  label: string;
  isInserted: boolean;
  x: number;
  y: number;
};

/** Final-array identities retain their order through a single middle splice. */
export function getSpliceGeometryFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): GetSpliceGeometryResult[] {
  const separation = ramp(frame, 38, 30, EASE.inOut);
  const insertion = ramp(frame, 62, 36, EASE.inOut);
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
