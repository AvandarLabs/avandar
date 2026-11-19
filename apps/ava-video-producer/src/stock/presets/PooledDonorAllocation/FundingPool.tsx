import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";

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
  const graphicTokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
        fillOpacity={0.025}
        stroke={graphicTokens.color.inactive}
      />
      {input.showAllocationTotals ? (
        <text
          data-pool-balance={remaining}
          x={220}
          y={277}
          fill={accent}
          fontSize={16}
        >
          {remaining}
        </text>
      ) : undefined}
    </g>
  );
}
