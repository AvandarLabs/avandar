import { ClassroomFurniture } from "./ClassroomFurniture";
import { ClassroomLabels } from "./ClassroomLabels";
import { ClassroomLearner } from "./ClassroomLearner";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";
/** Inputs for ClassroomAccessRearrangement. */
type Props = GraphicProps & { input: Input };

/** The same learners join one activity after selected furniture adaptations. */
export function ClassroomAccessRearrangement({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ClassroomFurniture input={input} frame={frame} accent={accent} />
      <ClassroomLabels input={input} frame={frame} />
      {input.learners.map((learner, index) => (
        <ClassroomLearner
          key={learner.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
