import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";
type Props = {
  learner: Input["learners"][number];
  personX: number;
  y: number;
  accent: string;
};
/** Prediction Actor for the authored scene. */
export function PredictionActor({
  learner,
  personX,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-experiment-learner={learner.id}
      transform={`translate(${personX} ${y})`}
    >
      <PersonGlyph x={0} y={0} size={32} color={accent} />
      <path
        data-prediction-hand={learner.id}
        d="M4 0 L25 8"
        stroke={accent}
        strokeWidth={2}
        fill="none"
      />
    </g>
  );
}
