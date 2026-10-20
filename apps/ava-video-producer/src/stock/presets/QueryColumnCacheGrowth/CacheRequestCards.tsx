import { StockRect } from "../../primitives/StockRect/StockRect";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * Two authored request cards retain their labels through the coverage checks.
 */
export function CacheRequestCards({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.requests.map((request, index) => (
        <g key={index}>
          <StockRect
            x={60 + index * 440}
            y={54}
            width={400}
            height={124}
            rx={10}
            fill={STOCK.elevated}
            stroke={index === 0 && frame >= 40 ? accent : STOCK.line}
          />
          <LabelSlots
            labels={[[request.label, 80 + index * 440, 82, 330, 18, 3]]}
          />
          {index === 0 && frame >= 40 ? (
            <path
              data-covered="true"
              d="M420 132 l10 10 l18 -26"
              stroke={accent}
              strokeWidth={3}
              fill="none"
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
