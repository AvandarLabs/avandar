import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FeedbackDraftDefinitions } from "./FeedbackDraftDefinitions/FeedbackDraftDefinitions";
import { FeedbackDraftDraftLabel } from "./FeedbackDraftDraftLabel/FeedbackDraftDraftLabel";
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
      <FeedbackDraftDefinitions {...{ clipId, x, revision }} />
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
      <FeedbackDraftDraftLabel {...{ clipId, round, x }} />
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
