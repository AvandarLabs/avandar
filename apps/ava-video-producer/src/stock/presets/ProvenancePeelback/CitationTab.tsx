import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { label: string; frame: number; accent: string };
/** A literal citation tab meets the summary's right edge. */
export function CitationTab({
  label,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.ramp(frame, 82, motion.scale(22))}>
      <StockRect
        data-citation-tab="summary-edge"
        x={16}
        y={220}
        width={384}
        height={30}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <FitText
        text={label}
        x={32}
        y={242}
        width={352}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        color={accent}
      />
    </g>
  );
}
