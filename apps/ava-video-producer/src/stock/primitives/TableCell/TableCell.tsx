import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FitText } from "../FitText/FitText";
import { StockRect } from "../StockRect";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  width: number;
  text: string;
  highlighted?: boolean;
  /** Defaults to the theme's positive colour. */
  color?: string;
};
/**
 * Bounded table presentation retains the caller's exact value or missing label.
 */
export function TableCell({
  x,
  y,
  width,
  text,
  highlighted = false,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const accent = color ?? tokens.color.positive;
  if (![x, y, width].every(Number.isFinite) || width < 100 || width > 800) {
    throw new Error(
      "Table cells require finite placement and widths from 100 to 800 pixels.",
    );
  }
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={64}
        fill={highlighted ? accent : tokens.color.surface}
        fillOpacity={highlighted ? scales.wash(tokens.alpha.wash) : 1}
        stroke={highlighted ? accent : tokens.color.line}
      />
      <FitText
        x={x + 10}
        y={y + 24}
        width={width - 20}
        text={text}
        fontSize={16}
        maxLines={2}
      />
    </g>
  );
}
