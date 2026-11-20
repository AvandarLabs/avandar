import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { rows: readonly string[]; x: number; isReload?: boolean };
/** Literal row occurrences retain empty strings and exact whitespace. */
export function QuarantinedRows({
  rows,
  x,
  isReload = false,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {rows.map((value, index) => {
        return (
          <g
            key={index}
            data-table-row={isReload ? undefined : index}
            data-raw-value={value}
            data-reload-row={isReload ? index : undefined}
          >
            <StockRect
              x={x}
              y={158 + index * 70}
              width={520}
              height={62}
              fill={tokens.color.surface}
              stroke={tokens.color.line}
            />
            <LiteralDataText value={value} x={x + 20} y={195 + index * 70} />
          </g>
        );
      })}
    </g>
  );
}
