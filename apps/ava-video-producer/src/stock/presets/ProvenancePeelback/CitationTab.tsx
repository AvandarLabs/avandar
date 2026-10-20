import { StockRect } from "../../primitives/StockRect/StockRect";
import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { label: string; frame: number; accent: string };
/** A literal citation tab meets the summary's right edge. */
export function CitationTab({
  label,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 82, 22)}>
      <StockRect
        data-citation-tab="summary-edge"
        x={16}
        y={220}
        width={384}
        height={30}
        fill={STOCK.surface}
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
