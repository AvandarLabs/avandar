import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { CacheCell } from "./CacheCell";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";

type Props = {
  column: Input["columns"][number];
  index: number;
  rowCount: number;
  isAdded: boolean;
  growth: number;
  accent: string;
};
/** Each complete column carries all of its original row-indexed cell values. */
export function CacheColumn({
  column,
  index,
  rowCount,
  isAdded,
  growth,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-cache-column={column.id} opacity={isAdded ? growth : 1}>
      <path
        d={`M${60 + index * 168} 260 V${334 + rowCount * 44}`}
        stroke={isAdded ? accent : STOCK.line}
      />
      <LabelSlots
        labels={[[column.label, 70 + index * 168, 280, 148, 14, 4]]}
      />
      {column.cells.map((value, rowIndex) => (
        <CacheCell
          key={rowIndex}
          value={value}
          columnId={column.id}
          rowIndex={rowIndex}
          x={70 + index * 168}
          y={351 + rowIndex * 44}
        />
      ))}
    </g>
  );
}
