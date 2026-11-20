import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  field: string;
  x: number;
  y: number;
  value: string;
  stroke: string;
  isReference?: boolean;
};
/** Full literal value retained inside one source's context window. */
export function SourceContextCell({
  field,
  x,
  y,
  value,
  stroke,
  isReference = false,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-invoice-window={isReference ? undefined : field}
        data-reference-window={isReference ? field : undefined}
        x={x}
        y={y - 7}
        width={330}
        height={31}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={stroke}
      />
      <LiteralDataText value={value} x={x + 10} y={y + 13} />
    </g>
  );
}
