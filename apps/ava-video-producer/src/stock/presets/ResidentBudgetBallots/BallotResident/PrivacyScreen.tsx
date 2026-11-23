import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { ballotId: string; sourceX: number };

/** The screen that keeps a paper private until it is cast. */
export function PrivacyScreen({
  ballotId,
  sourceX,
}: Readonly<Props>): ReactNode {
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
