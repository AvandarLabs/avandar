import { Card } from "../../../graphics-common/Card";
import { FitText } from "../../../primitives/FitText/FitText";
import { wrapTextToLines } from "../../../primitives/FitText/wrapTextToLines";
import { useGraphicTokens } from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

const SUMMARY_TOP = 44;
const CARD_WIDTH = 376;
const CARD_FONT_SIZE = 12;
const CARD_MAX_LINES = 4;

/** The Card component values the summary layout depends on. */
export type RouteSummaryCardMetrics = Readonly<{
  padding: number;
  baseHeight: number;
  textBaseline: number;
}>;

type Props = Readonly<{
  label: string;
  accent: string;
  right: number;
  card: RouteSummaryCardMetrics;
}>;

/**
 * A long authored summary wrapped onto a few lines inside a card. The card
 * values come from the caller, which reads them on every render.
 */
export function RouteSummaryCard({
  label,
  accent,
  right,
  card,
}: Props): ReactNode {
  const tokens = useGraphicTokens();
  const innerWidth = CARD_WIDTH - card.padding * 2;
  const lines = wrapTextToLines({
    text: label,
    width: innerWidth,
    fontSize: CARD_FONT_SIZE,
    maxLines: CARD_MAX_LINES,
  });
  const lineStep = Number(
    (CARD_FONT_SIZE * (tokens.text.graphic.data.lineHeight ?? 1.3)).toFixed(4),
  );
  const x = right - CARD_WIDTH;
  return (
    <Card
      x={x}
      y={SUMMARY_TOP}
      width={CARD_WIDTH}
      height={card.baseHeight + lines.length * lineStep}
      color={accent}
    >
      <FitText
        x={x + card.padding}
        y={SUMMARY_TOP + card.textBaseline}
        width={innerWidth}
        fontSize={CARD_FONT_SIZE}
        maxLines={CARD_MAX_LINES}
        text={label}
      />
    </Card>
  );
}
