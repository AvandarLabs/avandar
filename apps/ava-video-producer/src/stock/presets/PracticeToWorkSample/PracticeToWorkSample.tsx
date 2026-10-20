import { MeasuringLearner } from "./MeasuringLearner";
import { PracticeFurniture } from "./PracticeFurniture";
import { PracticeLabels } from "./PracticeLabels";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";
/** Inputs for PracticeToWorkSample. */
type Props = GraphicProps & { input: Input };

/** One learner repeats the same measured action on a selected work material. */
export function PracticeToWorkSample({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <PracticeFurniture input={input} frame={frame} accent={accent} />
      <MeasuringLearner input={input} frame={frame} accent={accent} />
      <PracticeLabels input={input} frame={frame} />
    </g>
  );
}
