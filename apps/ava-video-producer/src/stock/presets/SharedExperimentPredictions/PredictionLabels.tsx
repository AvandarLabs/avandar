import { FitText } from "../../primitives/FitText/FitText";
import { PredictionDifference } from "./PredictionDifference";
import { PredictionValues } from "./PredictionValues";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  learner: Input["learners"][number];
  index: number;
  y: number;
  frame: number;
  difference: number;
};
/** Prediction Labels for the authored scene. */
export function PredictionLabels({
  input,
  learner,
  index,
  y,
  frame,
  difference,
}: Readonly<Props>): ReactNode {
  return (
    <g data-prediction-labels="true">
      <FitText
        text={learner.label}
        x={40}
        y={y - 15}
        width={150}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={String(index + 1)}
        x={193}
        y={y - 15}
        width={16}
        fontSize={12}
        maxLines={1}
        normalizeWhitespace
      />
      <PredictionValues input={input} learner={learner} y={y} />
      <PredictionDifference
        input={input}
        frame={frame}
        difference={difference}
        y={y}
      />
    </g>
  );
}
