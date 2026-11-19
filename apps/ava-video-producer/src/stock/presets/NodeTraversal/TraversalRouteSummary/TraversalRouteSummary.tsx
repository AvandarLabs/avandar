import { GRAPHIC_WIDTH } from "../../../graphics-common/graphicCanvas.constants";
import { Pill } from "../../../graphics-common/Pill";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import { getLegacyWidthFromText } from "../../legacy/getLegacyWidthFromText/getLegacyWidthFromText";
import { RouteSummaryCard } from "./RouteSummaryCard";
import type { ReactNode } from "react";

type Props = { label: string; accent: string };

const SUMMARY_TOP = 44;
const SHORT_PILL_WIDTH = 152;
const SHORT_TEXT_LIMIT = 140;
const LONG_TEXT_LIMIT = 356;
const PILL_TEXT_PADDING = 20;

/**
 * The badge width for a measured text width, or undefined when the text needs a
 * card.
 */
function _buildPillWidthFromTextWidth(textWidth: number): number | undefined {
  if (textWidth <= SHORT_TEXT_LIMIT) {
    return SHORT_PILL_WIDTH;
  }
  return textWidth <= LONG_TEXT_LIMIT
    ? Math.ceil(textWidth + PILL_TEXT_PADDING - 1e-9)
    : undefined;
}

/**
 * Keeps short route badges compact and long authored summaries in the header.
 * Widths are measured at the pill role's size, so the badge fits the text
 * the theme draws. The Card values are read before the shape is chosen, so
 * every render reports them whichever shape it draws.
 */
export function TraversalRouteSummary({
  label,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const card = useGraphicProps("Card", {});
  const right = GRAPHIC_WIDTH - tokens.layout.graphic.margin;
  const pillWidth = _buildPillWidthFromTextWidth(
    getLegacyWidthFromText({
      text: label,
      fontSize: tokens.text.graphic.pill.fontSize,
      mono: true,
    }),
  );
  if (pillWidth === undefined) {
    return (
      <RouteSummaryCard
        label={label}
        accent={accent}
        right={right}
        card={card}
      />
    );
  }
  return (
    <Pill
      x={right - pillWidth}
      y={SUMMARY_TOP}
      width={pillWidth}
      text={label}
      color={accent}
    />
  );
}
