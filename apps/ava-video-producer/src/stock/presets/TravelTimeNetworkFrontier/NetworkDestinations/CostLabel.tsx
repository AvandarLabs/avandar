import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getTravelCostsFromInput } from "../getTravelCostsFromInput";
import type { ReactNode } from "react";

type Props = {
  node: ReturnType<typeof getTravelCostsFromInput>[number];
  index: number;
};

/** The destination's shortest travel cost, right-aligned in the ledger. */
export function CostLabel({ node, index }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      data-cost-label={node.id}
      x={890}
      y={156 + index * 54}
      fill={tokens.color.text}
      textAnchor="end"
      fontSize={tokens.text.graphic.secondary.fontSize}
      fontFamily={tokens.text.graphic.secondary.fontFamily}
      fontWeight={tokens.text.graphic.secondary.fontWeight}
    >
      {node.cost}
    </text>
  );
}
