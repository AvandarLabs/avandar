import { StockRect } from "../../../primitives/StockRect";
import { CacheColumn } from "../CacheColumn";
import { CachedRelationFrame } from "./CachedRelationFrame";
import { useCachedRelationPresentation } from "./useCachedRelationPresentation";
import type { getCacheSceneFromFrame } from "../getCacheSceneFromFrame";
import type { Input } from "../QueryColumnCacheGrowth.schema.ts";
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
export function CachedRelation(props: Readonly<Props>): ReactNode {
  const presentation = useCachedRelationPresentation(props);

  return (
    <g>
      <CachedRelationFrame {...presentation} />
      {Array.from({ length: props.scene.rowCount }, (_, rowIndex) => {
        return (
          <StockRect
            key={rowIndex}
            data-cache-row={rowIndex}
            x={60}
            y={334 + rowIndex * 44}
            width={props.scene.width}
            height={44}
            fill="none"
            stroke={presentation.color.line}
            strokeWidth={presentation.scales.stroke(
              presentation.style.gridStrokeWidth,
            )}
          />
        );
      })}
      {presentation.columns.map((column, index) => {
        // The schema permits at most five cached columns. A
        // per-frame Set costs more than the bounded lookup in
        // measurement.
        // react-doctor-disable-next-line js-set-map-lookups
        const isAdded = !props.input.cachedColumnIds.includes(column.id);
        return (
          <CacheColumn
            key={column.id}
            column={column}
            index={index}
            rowCount={props.scene.rowCount}
            isAdded={isAdded}
            growth={props.scene.growth}
            accent={props.accent}
          />
        );
      })}
    </g>
  );
}
