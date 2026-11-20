import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  cellKey: string;
  x: number;
  y: number;
  width: number;
  isMissing: boolean;
  color: string;
};
/** A cell's frame, dashed in the highlight when its value is missing. */
export function TransferCell({
  cellKey,
  x,
  y,
  width,
  isMissing,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-transfer-cell={cellKey}
      x={x}
      y={y - 44}
      width={width}
      height={108}
      rx={scales.corner(5)}
      fill={tokens.color.surface}
      stroke={isMissing ? tokens.color.highlight : color}
      strokeDasharray={isMissing ? atomic.dash.tight.join(" ") : undefined}
    />
  );
}
