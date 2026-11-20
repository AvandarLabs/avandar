import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ByteItemShared } from "./ByteItemShared/ByteItemShared";
import type { ReactNode } from "react";
/** The item's identity tab, kept even when it holds zero bytes. */
export function CountTab({
  itemId,
  x,
  y,
}: Readonly<{ itemId: string; x: number; y: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-count-tab={itemId}
      x={x}
      y={y - 15}
      width={365}
      height={34}
      rx={scales.corner(ByteItemShared.TAB_CORNER)}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
