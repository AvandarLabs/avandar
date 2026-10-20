import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** The idle phone remains separate from held preparations. */
export function ConsentDesk(): ReactNode {
  return (
    <g>
      {" "}
      <path
        d="M390 175 H910 M410 175 V480 M900 175 V480"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <g data-phone="idle">
        <rect
          x={850}
          y={135}
          width={48}
          height={28}
          rx={8}
          fill={STOCK.surface}
          stroke={STOCK.muted}
        />
        <path
          d="M858 145 Q874 132 890 145"
          fill="none"
          stroke={STOCK.muted}
          strokeWidth={5}
        />
      </g>
    </g>
  );
}
