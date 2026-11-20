import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SlotText } from "./SlotText";
import type { Input } from "../RetryBackoff.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; accent: string };
/** External attempt copy never widens the quantitative waiting intervals. */
export function BackoffLabel({
  input,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
        rx={scales.corner(tokens.corner.label)}
        fill={tokens.color.surface}
      />
      {input.showAttemptLabels ? (
        <SlotText text={attempt.label} slotX={slotX} y={440} />
      ) : undefined}
      <SlotText
        text={input.outcomeLabels[attempt.outcome]}
        slotX={slotX}
        y={510}
        color={isFinal ? accent : tokens.color.textMuted}
      />
    </g>
  );
}
