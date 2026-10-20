import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { rows: readonly string[]; x: number; isReload?: boolean };
/** Literal row occurrences retain empty strings and exact whitespace. */
export function QuarantinedRows({
  rows,
  x,
  isReload = false,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {rows.map((value, index) => (
        <g
          key={index}
          data-table-row={isReload ? undefined : index}
          data-raw-value={value}
          data-reload-row={isReload ? index : undefined}
        >
          <rect
            x={x}
            y={158 + index * 70}
            width={520}
            height={62}
            fill={STOCK.surface}
            stroke={STOCK.line}
          />
          <LiteralDataText value={value} x={x + 20} y={195 + index * 70} />
        </g>
      ))}
    </g>
  );
}
