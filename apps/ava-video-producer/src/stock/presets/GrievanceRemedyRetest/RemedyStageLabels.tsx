import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";
/** Inputs for RemedyStageLabels. */
type Props = { frame: number; input: Input };

/** Each stage retains its authored label only after that action is reached. */
export function RemedyStageLabels({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots labels={[[input.labels.issue, 48, 466, 260, 14, 3]]} />
      {frame >= 78 ? (
        <LabelSlots labels={[[input.labels.repair, 350, 466, 260, 14, 3]]} />
      ) : undefined}
      {frame >= 88 && input.testResults.after !== "not-tested" ? (
        <LabelSlots labels={[[input.labels.test, 652, 466, 260, 14, 3]]} />
      ) : undefined}
    </g>
  );
}
