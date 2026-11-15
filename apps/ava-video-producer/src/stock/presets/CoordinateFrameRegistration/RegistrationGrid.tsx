import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { RegistrationAxes } from "./RegistrationAxes";
import type { ReactNode } from "react";

type Props = { x: number; index: number; frame: number };
/**
 * A fixed numeric square gives coordinate representations a stable reference.
 */
export function RegistrationGrid({
  x,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-grid-ground={index}
        x={x}
        y={185}
        width={240}
        height={240}
        fill="none"
        stroke={STOCK.line}
      />
      {[0, 1, 2, 3, 4].map((tick) => (
        <path
          key={tick}
          d={`M${x + tick * 60} 185 V425 M${x} ${185 + tick * 60} H${x + 240}`}
          stroke={STOCK.line}
          opacity={ramp(frame, 13, 39)}
        />
      ))}
      <RegistrationAxes x={x} index={index} />
    </g>
  );
}
