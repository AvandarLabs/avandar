import { EASE, ramp } from "../../../motion";
import type { Input } from "./QueryColumnCacheGrowth.schema";
/** Data for getCacheSceneFromFrame. */
type GetCacheSceneFromFrameResult = {
  missingIds: string[];
  union: Array<{ id: string; label: string; cells: string[] }>;
  original: Array<{ id: string; label: string; cells: string[] }>;
  growth: number;
  width: number;
  rowCount: number;
};

/**
 * Existing column positions and row occurrences survive a single exact
 * column-set union.
 */
export function getCacheSceneFromFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): GetCacheSceneFromFrameResult {
  const missingIds = input.requests[1].columnIds.filter(
    (id) => !input.cachedColumnIds.includes(id),
  );
  const original = input.columns.filter(({ id }) =>
    input.cachedColumnIds.includes(id),
  );
  const additions = input.columns.filter(({ id }) => missingIds.includes(id));
  const union = [...original, ...additions];
  const growth = ramp(frame, 106, 33, EASE.inOut);
  return {
    missingIds,
    union,
    original,
    growth,
    width: 168 * (original.length + missingIds.length * growth),
    rowCount: input.columns[0].cells.length,
  };
}
