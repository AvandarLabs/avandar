import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { x: number; width: number };
/** Exact byte-width sender and receiver rails remain after each transfer. */
export function ByteIntervalRails({ x, width }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <rect
        x={x}
        y={180}
        width={width}
        height={54}
        fill="none"
        stroke={STOCK.line}
      />
      <rect
        x={x}
        y={380}
        width={width}
        height={54}
        fill="none"
        stroke={STOCK.line}
      />
    </g>
  );
}
