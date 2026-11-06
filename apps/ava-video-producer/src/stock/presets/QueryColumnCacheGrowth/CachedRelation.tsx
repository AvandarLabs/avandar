import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import { CacheColumn } from "./CacheColumn";
import type { getCacheSceneFromFrame } from "./getCacheSceneFromFrame";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getCacheSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * One table widens its existing row strips, never joining or deduplicating
 * rows.
 */
export function CachedRelation({
  input,
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const columns = frame < 106 ? scene.original : scene.union;
  return (
    <g>
      <StockRect
        data-cache-table="one"
        x={60}
        y={260}
        width={scene.width}
        height={74 + scene.rowCount * 44}
        rx={5}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      {Array.from({ length: scene.rowCount }, (_, rowIndex) => (
        <StockRect
          key={rowIndex}
          data-cache-row={rowIndex}
          x={60}
          y={334 + rowIndex * 44}
          width={scene.width}
          height={44}
          fill="none"
          stroke={STOCK.line}
        />
      ))}
      {columns.map((column, index) => (
        <CacheColumn
          key={column.id}
          column={column}
          index={index}
          rowCount={scene.rowCount}
          isAdded={!input.cachedColumnIds.includes(column.id)}
          growth={scene.growth}
          accent={accent}
        />
      ))}
    </g>
  );
}
