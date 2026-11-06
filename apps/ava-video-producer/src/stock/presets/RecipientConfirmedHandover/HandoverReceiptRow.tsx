import { FitText } from "../../primitives/FitText/FitText";
import { getHandoverPositionFromInputAndFrame } from "./getHandoverPositionFromInputAndFrame";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; index: number };

/**
 * Receipt numbers count only the units that have completed their physical pull.
 */
export function HandoverReceiptRow({
  input,
  frame,
  accent,
  index,
}: Readonly<Props>): ReactNode {
  const content = input.contents[index];
  const received = Array.from(
    { length: content.selectedUnits },
    (_, unitIndex) =>
      getHandoverPositionFromInputAndFrame({
        input,
        frame,
        contentIndex: index,
        unitIndex,
      }),
  ).filter(({ travel }) => travel === 1).length;
  return (
    <g data-receipt={content.id} data-selected={received}>
      <FitText
        text={content.label}
        x={718}
        y={180 + index * 80}
        width={190}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <text
        x={908}
        y={224 + index * 80}
        textAnchor="end"
        fontSize={16}
        fill={accent}
      >
        {received}
      </text>
    </g>
  );
}
