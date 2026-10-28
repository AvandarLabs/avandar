import { STOCK } from "../../stockPalette";
import { getMarketProductPositionFromInputAndFrame } from "./getMarketProductPositionFromInputAndFrame";
import type { Input } from "./HouseholdMarketChoice.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; index: number; accent: string };
const SYMBOLS: Record<"grain" | "beans" | "vegetables" | "soap", string> = {
  grain: "M0 12 V-13 M0 1 L-9 -8 M0 -3 L9 -12",
  beans: "M-9 -10 C-20 7 -1 15 4 4 C8 -7 0 -15 -9 -10 M5 8 C16 19 23 3 14 -2",
  vegetables: "M-9 0 Q-20 -15 0 -12 Q20 -15 9 0 L0 15 Z",
  soap: "M-13 -7 Q0 -16 13 -7 V7 Q0 16 -13 7 Z",
};
/** One physical shelf product moves only when the household chose it. */
export function MarketProduct({
  input,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const product = input.products[index];
  const { x, y, travel } = getMarketProductPositionFromInputAndFrame({
    input,
    frame,
    index,
  });
  return (
    <g
      data-product={product.id}
      data-owner={travel === 1 ? "basket" : travel === 0 ? "shelf" : "shopper"}
      data-x={x}
      data-y={y}
      transform={`translate(${x} ${y})`}
    >
      <rect
        x={-23}
        y={-24}
        width={46}
        height={48}
        rx={6}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        d={SYMBOLS[product.symbol]}
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
      />
    </g>
  );
}
