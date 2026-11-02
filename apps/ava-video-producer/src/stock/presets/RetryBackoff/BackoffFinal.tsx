import { STOCK } from "../../stockPalette";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";

type Props = { outcome: Input["attempts"][number]["outcome"]; x: number };
/** The declared final outcome draws a completion socket or stop cap. */
export function BackoffFinal({ outcome, x }: Readonly<Props>): ReactNode {
  return (
    <g data-final-outcome={outcome}>
      {outcome === "complete" ? (
        <circle
          data-completed-socket="true"
          cx={x}
          cy={310}
          r={18}
          fill="none"
          stroke={STOCK.mint}
          strokeWidth={2}
        />
      ) : (
        <path d={`M${x + 18} 284 V336`} stroke={STOCK.orange} strokeWidth={5} />
      )}
    </g>
  );
}
