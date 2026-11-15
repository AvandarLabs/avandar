import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = { input: Input; learner: Input["learners"][number]; y: number };
/** Prediction Values for the authored scene. */
export function PredictionValues({
  input,
  learner,
  y,
}: Readonly<Props>): ReactNode {
  return input.showPredictionValues ? (
    <FitText
      text={`${learner.predictionDistance} ${input.track.unit}`}
      x={210}
      y={y - 12}
      width={196}
      fontSize={12}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
    />
  ) : undefined;
}
