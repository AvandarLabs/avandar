import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** Inputs for LockerObject. */
type Props = { functioning: number; accent: string };

/** The locker door stays visibly ajar until a functioning retest. */
export function LockerObject({
  functioning,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={400}
        y={230}
        width={180}
        height={180}
        rx={6}
        fill={STOCK.surface}
        stroke={STOCK.muted}
        strokeWidth={3}
      />
      <path
        data-locker-door="operated"
        d={`M406 237 L${mix(functioning, 490, 574)} ${mix(functioning, 260, 237)} V${mix(functioning, 430, 403)} L406 403 Z`}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={3}
      />
    </g>
  );
}
