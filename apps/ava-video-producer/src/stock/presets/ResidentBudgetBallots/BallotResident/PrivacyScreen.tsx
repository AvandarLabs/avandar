import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The screen that keeps a paper private until it is cast. */
export function PrivacyScreen({
  ballotId,
  sourceX,
}: Readonly<{ ballotId: string; sourceX: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <StockRect
      data-privacy-screen={ballotId}
      x={sourceX - 2}
      y={118}
      width={42}
      height={46}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
