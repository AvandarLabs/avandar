import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { BallotBox } from "./BallotBox";
import { BallotPapers } from "./BallotPapers";
import { ProjectDisplay } from "./ProjectDisplay";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ResidentBudgetBallots.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Anonymous papers become an identity-preserving preference tally. */
export function ResidentBudgetBallots({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.example, 48, 28, 864, 16, 1],
          [input.labels.choices, 48, 65, 270, 14, 3],
          [input.labels.box, 350, 65, 260, 14, 3],
          [input.labels.tally, 650, 65, 262, 14, 3],
          [input.labels.unit, 48, 560, 864, 12, 1],
          [input.closingNote, 48, 590, 864, 16, 1],
        ]}
      />
      <BallotPapers frame={frame} input={input} accent={accent} />
      <BallotBox frame={frame} />
      <ProjectDisplay input={input} frame={frame} />
    </g>
  );
}
