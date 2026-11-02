import { EASE, mix, ramp } from "../../../motion";
import { DistanceBracket } from "./DistanceBracket";
import { PredictionActor } from "./PredictionActor";
import { PredictionDrop } from "./PredictionDrop";
import { PredictionFlag } from "./PredictionFlag";
import { PredictionLabels } from "./PredictionLabels";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/**
 * Each participant carries a keyed flag to an authored position in its own
 * lane.
 */
export function PredictionParticipant({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const learner = input.learners[index];
  const y = 180 + index * 84;
  const targetX =
    450 + (430 * learner.predictionDistance) / input.track.maximum;
  const progress = ramp(frame, 36 + index * 6, 12, EASE.inOut);
  const flagX = mix(progress, 450, targetX);
  const personX = flagX - 25;
  const difference = Math.abs(
    learner.predictionDistance - input.observationDistance,
  );
  return (
    <g data-prediction-participant={learner.id}>
      <PredictionLabels {...{ input, learner, index, y, frame, difference }} />{" "}
      <PredictionActor {...{ learner, personX, y, accent }} />
      <PredictionFlag {...{ learner, frame, index, flagX, y, accent }} />
      <PredictionDrop {...{ learner, frame, targetX, y, accent }} />
      <DistanceBracket {...{ input, learner, frame, targetX, y }} />
    </g>
  );
}
