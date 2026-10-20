import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { x: number; width: number };
/** Hatch marks remain within the exact remaining reserve width. */
export function ReserveHatching({ x, width }: Readonly<Props>): ReactNode {
  return (
    <g>
      {Array.from({ length: Math.floor(width / 12) }, (_, index) => (
        <path
          key={index}
          d={`M${x + index * 12} 370 l${Math.min(10, width - index * 12)} -60`}
          stroke={STOCK.muted}
          strokeOpacity={0.25}
        />
      ))}
    </g>
  );
}
