import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { rowKey: string; y: number; label: string; progress: number };

/** A left join retains an explicit authored absent-partner label. */
export function JoinMissingPartner({
  rowKey,
  y,
  label,
  progress,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g opacity={progress} data-empty-partner={rowKey}>
      <StockRect
        x={480}
        y={y}
        width={416}
        height={60}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeDasharray={tokens.dash.placeholder.join(" ")}
      />
      <FitText
        text={label}
        x={492}
        y={y + 34}
        width={390}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
