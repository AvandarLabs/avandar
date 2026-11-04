import type { ReactNode } from "react";
/** Inputs for LandSteward. */
type Props = { x: number; y: number; accent: string };

/** The steward carries the barrier at its visible leading edge. */
export function LandSteward({ x, y, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      <circle
        data-steward-head="physical"
        cx={x - 35}
        cy={y - 30}
        r={8}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <path
        data-steward-body="physical"
        d={`M${x - 35} ${y - 22}v30l-10 20M${x - 35} ${y + 8}l10 20M${x - 35} ${y - 10}L${x - 18} ${y + 12}L${x} ${y + 12}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <circle data-hand="contact" cx={x} cy={y + 12} r={3} fill={accent} />
    </g>
  );
}
