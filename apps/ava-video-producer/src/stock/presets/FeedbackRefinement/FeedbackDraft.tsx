import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getFeedbackStateFromInputAndFrame } from "./getFeedbackStateFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  state: ReturnType<typeof getFeedbackStateFromInputAndFrame>;
  accent: string;
  id: string;
};
/** One draft wipes into its supplied revision while retaining its note. */
export function FeedbackDraft({
  state,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, round, revision } = state;
  const clipId = `feedback-${encodeURIComponent(id)}`;
  return (
    <g>
      <defs>
        <clipPath id={`${clipId}-draft`}>
          <rect
            x={x + 16 + 268 * revision}
            y={230}
            width={268 * (1 - revision)}
            height={84}
          />
        </clipPath>
        <clipPath id={`${clipId}-revision`}>
          <rect x={x + 16} y={230} width={268 * revision} height={84} />
        </clipPath>
      </defs>
      <StockRect
        data-draft={revision === 1 ? round.revised : round.draft}
        x={x}
        y={220}
        width={300}
        height={100}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <g clipPath={`url(#${clipId}-draft)`}>
        <FitText
          text={round.draft}
          x={x + 16}
          y={247}
          width={268}
          fontSize={18}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <g clipPath={`url(#${clipId}-revision)`}>
        <FitText
          text={round.revised}
          x={x + 16}
          y={247}
          width={268}
          fontSize={18}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </g>
  );
}
