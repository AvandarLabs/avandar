import { ExperimentLabels } from "./ExperimentLabels";
import { ExperimentTrack } from "./ExperimentTrack";
import { PredictionParticipant } from "./PredictionParticipant";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";
/** Inputs for SharedExperimentPredictions. */
type Props = GraphicProps & { input: Input };

/**
 * Participants place separate predictions before one authored tabletop roll.
 */
export function SharedExperimentPredictions({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ExperimentTrack input={input} frame={frame} accent={accent} />
      {input.learners.map((learner, index) => (
        <PredictionParticipant
          key={learner.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <ExperimentLabels input={input} frame={frame} />
    </g>
  );
}
