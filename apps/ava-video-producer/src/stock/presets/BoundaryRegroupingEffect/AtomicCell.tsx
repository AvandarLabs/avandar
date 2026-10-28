import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";
type Props = { cell: Input["cells"][number]; showValues: boolean };
/** Immutable atomic cells retain their original positions and quantities. */
export function AtomicCell({ cell, showValues }: Readonly<Props>): ReactNode {
  const x = 60 + cell.column * 120,
    y = 150 + cell.row * 110;
  return (
    <g>
      <rect
        data-atomic-cell={cell.id}
        x={x}
        y={y}
        width={120}
        height={110}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <LabelSlots labels={[[cell.label, x + 10, y + 25, 100, 12, 4]]} />
      {showValues ? (
        <LabelSlots
          labels={[
            [
              `${cell.records} / ${cell.population}`,
              x + 10,
              y + 90,
              100,
              12,
              1,
            ],
          ]}
        />
      ) : undefined}
    </g>
  );
}
