import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g
      data-experiment-learner={learner.id}
      transform={`translate(${personX} ${y})`}
    >
      <PersonGlyph x={0} y={0} size={32} color={accent} />
      <g data-prediction-hand={learner.id}>
        <SketchedShape
          shape={{ kind: "path", d: "M4 0 L25 8" }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          fill="none"
        />
      </g>
    </g>
  );
}
