import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";
/** The funding pool's tint, before the theme's tint strength. */
const POOL_TINT = 0.025;
type Props = {
  input: Input;
  tokens: ReturnType<typeof getAllocationTokensFromInputAndFrame>;
  accent: string;
};
/** The transparent pool counts only physically present, unallocated credits. */
export function FundingPool({
  input,
  tokens,
  accent,
}: Readonly<Props>): ReactNode {
  const graphicTokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const remaining = tokens.filter(({ owner }) => {
    return owner === "pool";
  }).length;
  return (
    <g>
      <StockRect
        x={248}
        y={232}
        width={655}
        height={104}
        rx={scales.corner(graphicTokens.corner.card)}
        fill={accent}
        fillOpacity={scales.wash(POOL_TINT)}
        stroke={graphicTokens.color.inactive}
      />
      {input.showAllocationTotals ? (
        <text
          data-pool-balance={remaining}
          x={220}
          y={277}
          fill={accent}
          fontSize={graphicTokens.text.graphic.secondary.fontSize}
          fontFamily={graphicTokens.text.graphic.secondary.fontFamily}
          fontWeight={graphicTokens.text.graphic.secondary.fontWeight}
        >
          {remaining}
        </text>
      ) : undefined}
    </g>
  );
}
