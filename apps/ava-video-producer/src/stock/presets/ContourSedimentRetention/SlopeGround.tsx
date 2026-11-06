import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** The common slope and outlet remain fixed through the intervention. */
export function SlopeGround(): ReactNode {
  return (
    <g>
      <path
        d="M80 200L750 380H910V415H80Z"
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <path
        data-exit="boundary"
        d="M750 280V420"
        stroke={STOCK.muted}
        strokeDasharray="5 5"
      />
    </g>
  );
}
