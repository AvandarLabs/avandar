import { STOCK } from "../../stockPalette";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";
type Props = {
  good: Input["goods"][number];
  unitIndex: number;
  x: number;
  y: number;
  owner: string;
  accent: string;
};
/** A single authored unit has one silhouette and exactly one current owner. */
export function ShelfUnit({
  good,
  unitIndex,
  x,
  y,
  owner,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-good={good.id}
      data-unit={unitIndex}
      data-owner={owner}
      transform={`translate(${x} ${y})`}
    >
      <rect
        x={-12}
        y={-14}
        width={24}
        height={28}
        rx={good.symbol === "vegetables" ? 12 : 4}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      {good.symbol === "grain" ? (
        <path
          d="M0 9 V-8 M0 -3 L-6 -7 M0 2 L6 -2"
          stroke={accent}
          fill="none"
        />
      ) : good.symbol === "beans" ? (
        <path
          d="M-5 -5 Q5 -11 6 0 Q5 11 -5 5 Q1 0 -5 -5"
          stroke={STOCK.orange}
          fill="none"
        />
      ) : (
        <path
          d="M0 6 Q-9 -4 0 -8 Q9 -4 0 6 M0 -8 V-12"
          stroke={STOCK.mint}
          fill="none"
        />
      )}
    </g>
  );
}
