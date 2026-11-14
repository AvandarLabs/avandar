import { useState } from "react";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** How many of the datasets a combine stacks are read so far. */
export type CombiningProgressCount = {
  readCount: number;
  totalCount: number;
};

/**
 * Counts the stacked datasets relation loading has in hand, from the
 * `onRelationFetched` reports of the combined preview's queries. A dataset
 * reported twice (by both preview queries, or by a nested virtual query)
 * counts once, and one the combine does not stack is not counted.
 */
export function useCombiningProgress(
  datasetIds: readonly Dataset.Id[],
): CombiningProgressCount & {
  onRelationFetched: (datasetId: Dataset.Id) => void;
  reset: () => void;
} {
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => {
    return new Set();
  });
  return {
    readCount: datasetIds.filter((datasetId) => {
      return readIds.has(datasetId);
    }).length,
    totalCount: datasetIds.length,
    onRelationFetched: (datasetId) => {
      setReadIds((priorIds) => {
        return priorIds.has(datasetId)
          ? priorIds
          : new Set([...priorIds, datasetId]);
      });
    },
    reset: () => {
      setReadIds(new Set());
    },
  };
}
