import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { x: number; y: number; awning: number; accent: string };
/** One persistent vehicle folds and unfolds its awning around the drive. */
export function ClinicVehicle({
  x,
  y,
  awning,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-clinic="vehicle"
      data-x={x}
      data-y={y}
      transform={`translate(${x} ${y})`}
    >
      <path
        d="M-42 -21 H23 L42 -3 V18 H-42 Z"
        fill={STOCK.elevated}
        stroke={accent}
        strokeWidth={2}
      />
      <path d="M25 -15 L35 -3 H25 Z" fill={STOCK.cyan} />
      <path d="M-16 -11 V9 M-26 -1 H-6" stroke={accent} strokeWidth={4} />
      <circle cx={-26} cy={20} r={7} fill={STOCK.ground} stroke={STOCK.muted} />
      <circle cx={28} cy={20} r={7} fill={STOCK.ground} stroke={STOCK.muted} />
      <path
        data-awning="clinic"
        d={`M-42 -22 H20 L${20 + awning * 10} ${-22 - awning * 22} H${-42 - awning * 10} Z`}
        fill={accent}
        opacity={0.55}
      />
    </g>
  );
}
