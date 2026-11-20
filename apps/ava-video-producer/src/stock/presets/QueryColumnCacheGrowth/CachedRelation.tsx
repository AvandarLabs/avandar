import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const style = GraphicThemeHooks.useGraphicProps("QueryColumnCacheGrowth", {});
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const columns = frame < 106 ? scene.original : scene.union;
  return (
    <g>
      <StockRect
        data-cache-table="one"
        x={60}
        y={260}
        width={scene.width}
        height={74 + scene.rowCount * 44}
        rx={scales.corner(style.tableRadius)}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={scales.stroke(style.tableStrokeWidth)}
      />
      {Array.from({ length: scene.rowCount }, (_, rowIndex) => {
        return (
          <StockRect
            key={rowIndex}
            data-cache-row={rowIndex}
            x={60}
            y={334 + rowIndex * 44}
            width={scene.width}
            height={44}
            fill="none"
            stroke={color.line}
            strokeWidth={scales.stroke(style.gridStrokeWidth)}
          />
        );
      })}
      {columns.map((column, index) => {
        return (
          <CacheColumn
            key={column.id}
            column={column}
            index={index}
            rowCount={scene.rowCount}
            isAdded={!input.cachedColumnIds.includes(column.id)}
            growth={scene.growth}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
