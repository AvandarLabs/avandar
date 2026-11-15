import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Props } from "./SharedFoundation";
import type { ReactNode } from "react";
/** One short support reconnects each preserved approach to the common base. */
export function FoundationSupports({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const reconnect = ramp(frame, 108, 12);
  return (
    <>
      {input.approaches.map((approach, index) => {
        const x = 260 + index * 440;
        return (
          <line
            key={approach.id}
            data-foundation-support={approach.id}
            x1={x}
            y1={330}
            x2={x}
            y2={mix(reconnect, 330, 390)}
            stroke={index ? STOCK.mint : accent}
            strokeWidth={3}
            opacity={reconnect}
          />
        );
      })}
    </>
  );
}
