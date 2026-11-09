import { useState } from "react";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Every places dataset id seen since the map opened. A dataset never stops
 * being a places dataset, so an id that briefly drops out of the list while
 * it refetches (right after a create, for example) stays known, and the
 * place tool does not fall back to asking for a dataset.
 */
export function useKnownPlacesDatasetIds(
  placesDatasetIds: ReadonlySet<Dataset.Id>,
): ReadonlySet<Dataset.Id> {
  const [knownIds, setKnownIds] = useState(placesDatasetIds);
  const hasNewId = [...placesDatasetIds].some((datasetId) => {
    return !knownIds.has(datasetId);
  });
  if (!hasNewId) {
    return knownIds;
  }
  const mergedIds = new Set([...knownIds, ...placesDatasetIds]);
  setKnownIds(mergedIds);
  return mergedIds;
}
