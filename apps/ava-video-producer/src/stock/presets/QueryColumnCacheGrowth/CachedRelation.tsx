import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const style = useGraphicProps("QueryColumnCacheGrowth", {});
  const { color } = useGraphicTokens();
  const columns = frame < 106 ? scene.original : scene.union;
  return (
    <g>
      <StockRect
        data-cache-table="one"
        x={60}
        y={260}
        width={scene.width}
        height={74 + scene.rowCount * 44}
        rx={style.tableRadius}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={style.tableStrokeWidth}
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
          stroke={color.line}
          strokeWidth={style.gridStrokeWidth}
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
