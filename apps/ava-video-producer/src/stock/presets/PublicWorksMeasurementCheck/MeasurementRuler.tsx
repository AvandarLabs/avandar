import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** A fixed eight-unit ruler preserves spatial scale across every input. */
export function MeasurementRuler(): ReactNode {
  return (
    <g>
      <line x1={200} y1={370} x2={720} y2={370} stroke={STOCK.line} />
      {Array.from({ length: 9 }, (_, index) => (
        <line
          key={index}
          x1={200 + index * 65}
          x2={200 + index * 65}
          y1={365}
          y2={375}
          stroke={STOCK.muted}
        />
      ))}
    </g>
  );
}
