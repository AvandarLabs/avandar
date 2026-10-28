import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";
type Props = {
  sourceLabel: string;
  value: string;
  labels: Input["labels"];
  x: number;
  top: number;
  isChosen: boolean;
  isResolved: boolean;
  progress: number;
};
/** Result or alternative headings stay attached to the actual source value. */
export function ConflictCandidateCopy({
  sourceLabel,
  value,
  labels,
  x,
  top,
  isChosen,
  isResolved,
  progress,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {isResolved && progress > 0 ? (
        <g opacity={progress}>
          <FitText
            text={isChosen ? labels.result : labels.alternatives}
            x={x + 12}
            y={top + 14}
            width={392}
            fontSize={12}
            maxLines={1}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ) : undefined}
      <FitText
        text={sourceLabel}
        x={x + 12}
        y={top + 31}
        width={392}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      <LiteralDataText value={value} x={x + 12} y={top + 54} />
    </g>
  );
}
