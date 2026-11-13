import { Card, GRAPHIC_WIDTH, Pill } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { wrapTextToLines } from "../../primitives/FitText/wrapTextToLines";
import { useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import { getLegacyWidthFromText } from "../legacy/getLegacyWidthFromText/getLegacyWidthFromText";
import type { ReactNode } from "react";

type Props = { label: string; accent: string };

const SUMMARY_TOP = 44;
const SHORT_PILL_WIDTH = 152;
const SHORT_TEXT_LIMIT = 140;
const LONG_TEXT_LIMIT = 356;
const PILL_TEXT_PADDING = 20;
const CARD_WIDTH = 376;
const CARD_FONT_SIZE = 12;
const CARD_MAX_LINES = 4;

/**
 * Keeps short route badges compact and long authored summaries in the header.
 * Widths are measured at the pill role's size, so the badge fits the text
 * the theme draws.
 */
export function TraversalRouteSummary({
  label,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const card = useGraphicProps("Card", {});
  const right = GRAPHIC_WIDTH - tokens.layout.graphic.margin;
  const textWidth = getLegacyWidthFromText({
    text: label,
    fontSize: tokens.text.graphic.pill.fontSize,
    mono: true,
  });
  if (textWidth <= SHORT_TEXT_LIMIT) {
    return (
      <Pill
        x={right - SHORT_PILL_WIDTH}
        y={SUMMARY_TOP}
        width={SHORT_PILL_WIDTH}
        text={label}
        color={accent}
      />
    );
  }
  if (textWidth <= LONG_TEXT_LIMIT) {
    const width = Math.ceil(textWidth + PILL_TEXT_PADDING - 1e-9);
    return (
      <Pill
        x={right - width}
        y={SUMMARY_TOP}
        width={width}
        text={label}
        color={accent}
      />
    );
  }
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
