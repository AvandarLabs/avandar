import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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

/** A candidate card's corner before the corner style scales it. */
const CARD_CORNER = 5;
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const layout = getDuplicateCardLayoutFromGroupAndFrame({
    frame,
    input,
    group,
    groupIndex,
    record,
    index,
    motion,
  });
  const { x, y, width, height, isRetained, isFolded } = layout;
  return (
    <g>
      <StockRect
        data-candidate-id={record.id}
        data-group-id={group.id}
        data-retained-id={isRetained && isFolded ? record.id : undefined}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={scales.corner(CARD_CORNER)}
        fill={tokens.color.surface}
        stroke={isRetained ? accent : tokens.color.line}
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
