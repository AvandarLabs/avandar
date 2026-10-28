import { ramp } from "../../../motion";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";
type Props = {
  outcome: Input["cases"][number]["outcome"];
  x: number;
  y: number;
  frame: number;
  accent: string;
};
/** The same distinct outcome symbols identify rows and ledger entries. */
export function ReconnectOutcomeMark({
  outcome,
  x,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g transform={`translate(${x - 395} 0)`}>
      <path
        data-outcome-mark={outcome}
        d={
          outcome === "unreached"
            ? `M390 ${y - 5} l10 10 M390 ${y + 5} l10 -10`
            : outcome === "contacted"
              ? `M387 ${y - 7} h20 v12 h-10 l-5 5 v-5 h-5 Z`
              : outcome === "booked"
                ? `M390 ${y - 8} h15 v16 h-15 Z`
                : `M388 ${y} l6 6 12 -13`
        }
        fill="none"
        stroke={accent}
        opacity={ramp(frame, 106, 8)}
      />
    </g>
  );
}
