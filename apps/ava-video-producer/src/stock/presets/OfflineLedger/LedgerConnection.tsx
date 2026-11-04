import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { frame: number; accent: string };
/**
 * The connection arc collapses at the first entry and stays unavailable during
 * the hold.
 */
export function LedgerConnection({
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const connection = 1 - ramp(frame, 30, 6);
  return (
    <g data-connection={frame < 36 ? "available" : "unavailable"}>
      <path
        d={`M${mix(connection, 748, 738)} 124 Q748 ${mix(connection, 124, 108)} ${mix(connection, 748, 758)} 124`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        opacity={connection}
      />
      <circle
        cx={748}
        cy={130}
        r={3}
        fill={frame < 36 ? accent : STOCK.muted}
      />
      {frame >= 36 ? (
        <path d="M740 122 l16 16" stroke={STOCK.muted} />
      ) : undefined}
    </g>
  );
}
