import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./TradeoffPivot.schema";
import type { ReactNode } from "react";

type Props = { points: Input["gains"]; x: number; color: string };
/** Every authored point keeps the same fixed font and independent identity. */
export function TradeoffPoints({
  points,
  x,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {points.map((point, index) => {
        const label = {
          text: point.label,
          x: x + 46,
          y: 278 + index * 72,
          width: 336,
          fontSize: 18 as const,
          maxLines: 3,
        };
        return (
          <g key={point.id} data-point={point.id} aria-label={point.label}>
            <circle cx={x + 25} cy={271 + index * 72} r={3} fill={color} />
            <FitText {...label} breakLongWords normalizeWhitespace />
          </g>
        );
      })}
    </g>
  );
}
