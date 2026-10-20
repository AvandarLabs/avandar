import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { symbol: "bench" | "books" | "garden"; x: number; y: number };
/** Concrete project symbols preserve the authored choice identity. */
export function ProjectSymbol({ symbol, x, y }: Readonly<Props>): ReactNode {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke={STOCK.cyan}
      strokeWidth={3}
    >
      {symbol === "bench" ? (
        <path d="M-20 -7 H20 V4 H-20 Z M-16 4 V16 M16 4 V16 M-22 -15 H22" />
      ) : symbol === "books" ? (
        <path d="M-20 -14 h10 v29 h-10 Z M-5 -18 h10 v33 H-5 Z M10 -10 l10 -3 l7 26 l-10 3 Z" />
      ) : (
        <path d="M0 16 V-8 M0 2 Q-25 0 -16 -15 Q0 -15 0 2 M0 -4 Q22 -22 25 -9 Q25 3 0 -4 M-20 18 H25" />
      )}
    </g>
  );
}
