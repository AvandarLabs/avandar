import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { getAllocationHandlingFromTokens } from "./getAllocationHandlingFromTokens";
import type { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  tokens: ReturnType<typeof getAllocationTokensFromInputAndFrame>;
};

/**
 * The coordinator physically slides the clear scoop and withdraws after
 * release.
 */
export function AllocationCoordinator({
  input,
  frame,
  tokens,
}: Readonly<Props>): ReactNode {
  const pose = getAllocationHandlingFromTokens({ input, frame, tokens });
  return (
    <g>
      <PersonGlyph
        x={pose.bodyX}
        y={pose.bodyY}
        size={32}
        role="facilitator"
        color={STOCK.cyan}
      />
      <path
        data-coordinator-arm
        d={`M${pose.bodyX} ${pose.bodyY} L${pose.bodyX - 12} ${pose.handY - 4} L${pose.handX} ${pose.handY}`}
        stroke={STOCK.cyan}
        strokeWidth={2.5}
        fill="none"
      />
      <circle
        data-coordinator-hand
        cx={pose.handX}
        cy={pose.handY}
        r={3.5}
        fill={STOCK.cyan}
      />
      <path
        data-allocation-scoop
        d={`M${pose.left} ${pose.top} L${pose.left} ${pose.bottom} L${pose.right} ${pose.bottom} L${pose.right} ${pose.top}`}
        stroke={STOCK.cyan}
        strokeWidth={1.5}
        fill="none"
        opacity={pose.opacity}
      />
    </g>
  );
}
