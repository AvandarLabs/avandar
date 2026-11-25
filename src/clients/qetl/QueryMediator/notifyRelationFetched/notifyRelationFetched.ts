import { Logger } from "@/utils/Logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationFetchedListener } from "@/clients/qetl/QueryMediator/QueryMediator.types";

/**
 * Tells a caller's progress listener that a dataset's relation is in hand.
 * A query without a listener reports nothing. A listener that throws is
 * logged and ignored: progress is a courtesy, and it must never fail the
 * query it reports on.
 */
export function notifyRelationFetched(
  listener: RelationFetchedListener | undefined,
  datasetId: Dataset.Id,
): void {
  if (!listener) {
    return;
  }
  try {
    listener(datasetId);
  } catch (error) {
    Logger.error(error, {
      devMsg: `A relation progress listener failed for dataset ${datasetId}`,
    });
  }
}
