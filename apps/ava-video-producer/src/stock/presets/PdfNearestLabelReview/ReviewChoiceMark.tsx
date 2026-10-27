import { STOCK } from "../../stockPalette";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string; rowRight: number };
/**
 * An unresolved bracket retains both candidates, or one human choice is keyed.
 */
export function ReviewChoiceMark({
  input,
  accent,
  rowRight,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {input.reviewedLabelId === null ? (
        <path
          data-unresolved-bracket="true"
          d="M920 190 h8 v192 h-8"
          fill="none"
          stroke={STOCK.orange}
          strokeWidth={2}
        />
      ) : (
        <path
          data-review-choice={input.reviewedLabelId}
          d={`M904 ${225 + input.labels.findIndex(({ id }) => id === input.reviewedLabelId) * 95} H${rowRight + 8} V440 H${rowRight}`}
          fill="none"
          stroke={accent}
          strokeWidth={2}
        />
      )}
    </g>
  );
}
