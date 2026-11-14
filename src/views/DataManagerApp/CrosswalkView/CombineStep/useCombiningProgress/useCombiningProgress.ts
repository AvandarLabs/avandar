import { useState } from "react";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationFetchedListener } from "@/clients/qetl/QueryMediator/QueryMediator.types";

/** How many of the datasets a combine stacks are read so far. */
export type CombiningProgressCount = {
  readCount: number;
  totalCount: number;
};

/** The datasets reported for one read, tagged with that read's key. */
type ReadProgress = {
  readKey: string | undefined;
  readIds: ReadonlySet<string>;
};

/**
 * Counts the stacked datasets relation loading has in hand, from the
 * `onRelationFetched` reports of the combined preview's queries. A dataset
 * reported twice (by both preview queries, or by a nested virtual query)
 * counts once, and one the combine does not stack is not counted.
 *
 * Every read has a key. `startRead` begins one from none and returns the
 * listener for its queries, which ignores a report once another read has
 * started. The count is none while the current key is not the read being
 * counted, so a new read never shows the last read's total.
 */
export function useCombiningProgress(
  datasetIds: readonly Dataset.Id[],
  currentKey: string | undefined,
): CombiningProgressCount & {
  startRead: (readKey: string) => RelationFetchedListener;
} {
  const [progress, setProgress] = useState<ReadProgress>({
    readKey: undefined,
    readIds: new Set(),
  });
  const readIds =
    progress.readKey === currentKey ? progress.readIds : new Set<string>();
  return {
    readCount: datasetIds.filter((datasetId) => {
      return readIds.has(datasetId);
    }).length,
    totalCount: datasetIds.length,
    startRead: (readKey) => {
      setProgress({ readKey, readIds: new Set() });
      return (datasetId) => {
        setProgress((prior) => {
          return prior.readKey !== readKey || prior.readIds.has(datasetId)
            ? prior
            : { readKey, readIds: new Set([...prior.readIds, datasetId]) };
        });
      };
    },
  };
}
