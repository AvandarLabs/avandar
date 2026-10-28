import { STOCK } from "../../stockPalette";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Shelf bays reserve an individual slot for every authored available unit. */
export function ShelfStructure({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {input.goods.map((good, index) => (
        <g key={good.id}>
          <path
            d={`M155 ${221 + index * 105} H480 M155 ${187 + index * 105} V${221 + index * 105}`}
            stroke={STOCK.line}
            strokeWidth={3}
          />
          {Array.from(
            { length: good.openingUnits + good.incomingUnits },
            (_, slot) => (
              <rect
                key={slot}
                x={166 + slot * 56}
                y={183 + index * 105}
                width={28}
                height={34}
                rx={4}
                fill="none"
                stroke={STOCK.line}
                strokeDasharray="3 5"
              />
            ),
          )}
        </g>
      ))}
    </g>
  );
}
