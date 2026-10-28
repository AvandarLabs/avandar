import { STOCK } from "../../stockPalette";
import { DuplicateCandidateCopy } from "./DuplicateCandidateCopy";
import { DuplicateCandidateRole } from "./DuplicateCandidateRole";
import { getDuplicateCardLayoutFromGroupAndFrame } from "./getDuplicateCardLayoutFromGroupAndFrame";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  groupIndex: number;
  record: Input["groups"][number]["records"][number];
  index: number;
  accent: string;
};
/**
 * Candidate content stays intact behind the retained face, with exposed IDs.
 */
export function DuplicateCandidate({
  frame,
  input,
  group,
  groupIndex,
  record,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const layout = getDuplicateCardLayoutFromGroupAndFrame({
    frame,
    input,
    group,
    groupIndex,
    record,
    index,
  });
  const { x, y, width, height, isRetained, isFolded } = layout;
  return (
    <g>
      <rect
        data-candidate-id={record.id}
        data-group-id={group.id}
        data-retained-id={isRetained && isFolded ? record.id : undefined}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={STOCK.surface}
        stroke={isRetained ? accent : STOCK.line}
      />
      <DuplicateCandidateCopy
        input={input}
        record={record}
        layout={layout}
        accent={accent}
      />
      <DuplicateCandidateRole
        frame={frame}
        input={input}
        group={group}
        layout={layout}
        accent={accent}
      />
    </g>
  );
}
