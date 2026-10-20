import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";
type Props = { input: Input; index: number; accent: string };
/** External attempt copy never widens the quantitative waiting intervals. */
export function BackoffLabel({
  input,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const attempt = input.attempts[index];
  const slotX = 40 + index * 220;
  const isFinal = index === input.attempts.length - 1;
  return (
    <g>
      <rect
        data-attempt-label-slot={index}
        x={slotX}
        y={416}
        width={190}
        height={140}
        rx={10}
        fill={STOCK.surface}
      />
      {input.showAttemptLabels ? (
        <FitText
          text={attempt.label}
          x={slotX + 8}
          y={440}
          width={174}
          fontSize={14}
          maxLines={3}
          normalizeWhitespace
          breakLongWords
        />
      ) : undefined}
      <FitText
        text={input.outcomeLabels[attempt.outcome]}
        x={slotX + 8}
        y={510}
        width={174}
        fontSize={14}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
        color={isFinal ? accent : STOCK.muted}
      />
    </g>
  );
}
