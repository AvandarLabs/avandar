import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  labels: Input["labels"];
  isResolved: boolean;
  x: number;
  y: number;
  isPair: boolean;
  progress: number;
};
/** Stack decisions and open-group review status stay in the group heading. */
export function DuplicateDecisionLabels({
  frame,
  labels,
  isResolved,
  x,
  y,
  isPair,
  progress,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {frame >= 70 && (!isPair || !isResolved) ? (
        <g opacity={progress}>
          <FitText
            text={isResolved ? labels.retained : labels.unresolved}
            x={x}
            y={y - 22}
            width={416}
            fontSize={12}
            maxLines={1}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ) : undefined}
      {isResolved && !isPair && frame >= 100 ? (
        <FitText
          text={labels.alternatives}
          x={x}
          y={418}
          width={416}
          fontSize={12}
          maxLines={1}
          breakLongWords
          normalizeWhitespace
        />
      ) : undefined}
    </g>
  );
}
