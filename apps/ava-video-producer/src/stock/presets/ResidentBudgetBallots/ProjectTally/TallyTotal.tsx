import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { total: number; x: number; y: number; isAbstention: boolean };
/** A tally's total, in the highlight for abstentions. */
export function TallyTotal({
  total,
  x,
  y,
  isAbstention,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={x}
      y={y}
      fill={isAbstention ? tokens.color.highlight : tokens.color.text}
      fontSize={tokens.text.graphic.body.fontSize}
      fontFamily={tokens.text.graphic.body.fontFamily}
      fontWeight={tokens.text.graphic.body.fontWeight}
    >
      {total}
    </text>
  );
}
