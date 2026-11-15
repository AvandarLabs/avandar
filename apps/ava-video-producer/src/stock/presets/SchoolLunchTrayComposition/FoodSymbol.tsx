import { STOCK } from "../../stockPalette";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";

type Props = {
  symbol: Input["plannedComponents"][number]["symbol"];
  color: string;
};
/** Component-type silhouettes carry no portion or nutrition quantity. */
export function FoodSymbol({ symbol, color }: Readonly<Props>): ReactNode {
  return (
    <g fill={color} stroke={color} strokeWidth={1.3}>
      {symbol === "grain" ? (
        <>
          <ellipse cx={-4} cy={-3} rx={3} ry={5} />
          <ellipse cx={4} cy={3} rx={3} ry={5} />
        </>
      ) : undefined}
      {symbol === "beans" ? (
        <>
          <path d="M-8 -4 Q0 -10 2 -3 Q4 4 -4 4 Q-10 3 -8 -4" />
          <path d="M1 4 Q7 -1 9 5 Q9 10 3 10 Z" />
        </>
      ) : undefined}
      {symbol === "fruit" ? (
        <>
          <circle r={8} />
          <path d="M0 -8 Q1 -13 6 -12" fill="none" stroke={STOCK.mint} />
        </>
      ) : undefined}
      {symbol === "vegetables" ? (
        <>
          <path d="M-8 -2 Q0 -13 8 -2 L0 10 Z" />
          <path d="M0 -10 V9" stroke={STOCK.surface} />
        </>
      ) : undefined}
      {symbol === "cup" ? (
        <>
          <path d="M-7 -9 H7 L5 9 H-5 Z" fill="none" />
          <path d="M7 -5 Q15 -5 9 4" fill="none" />
        </>
      ) : undefined}
    </g>
  );
}
