import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = {
  learner: Input["learners"][number];
  frame: number;
  targetX: number;
  y: number;
  accent: string;
};
/** Prediction Drop for the authored scene. */
export function PredictionDrop({
  learner,
  frame,
  targetX,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  return frame >= 66 ? (
    <path
      data-prediction-drop={learner.id}
      d={`M${targetX} ${y + 24} V500`}
      stroke={accent}
      strokeOpacity={0.25}
      strokeWidth={1}
      strokeDasharray="3 5"
    />
  ) : undefined;
}
