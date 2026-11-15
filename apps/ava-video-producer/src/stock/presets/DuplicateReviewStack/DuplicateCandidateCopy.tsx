import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DuplicateReviewStack.schema";
import type { getDuplicateCardLayoutFromGroupAndFrame } from "./getDuplicateCardLayoutFromGroupAndFrame";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  record: Input["groups"][number]["records"][number];
  layout: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>;
  accent: string;
};
/** Candidate text keeps its fixed slots while the owning card moves. */
export function DuplicateCandidateCopy({
  input,
  record,
  layout,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, width, isRetained } = layout;
  return (
    <g>
      <FitText
        text={record.label}
        x={x + 4}
        y={y + 18}
        width={width - 8}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <LiteralDataText value={record.comparisonValue} x={x + 3} y={y + 76} />
      {input.showRecordIds ? (
        <LiteralDataText
          value={record.id}
          x={x + 12}
          y={y + 100}
          color={isRetained ? accent : STOCK.muted}
        />
      ) : undefined}
    </g>
  );
}
