import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const content = input.contents[index];
  const received = Array.from(
    { length: content.selectedUnits },
    (_, unitIndex) => {
      return getHandoverPositionFromInputAndFrame({
        input,
        frame,
        contentIndex: index,
        unitIndex,
        motion,
      });
    },
  ).filter(({ travel }) => {
    return travel === 1;
  }).length;
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
        fontSize={tokens.text.graphic.secondary.fontSize}
        fontFamily={tokens.text.graphic.secondary.fontFamily}
        fontWeight={tokens.text.graphic.secondary.fontWeight}
        fill={accent}
      >
        {received}
      </text>
    </g>
  );
}
