import { propEq } from "@avandar/utils";
import type { OfflineChatSchema } from "$/types/offlineChat.types";

/**
 * Returns an offline schema restricted to a dataset and its columns, while
 * retaining concepts.
 * Use it, for example, to give an offline SQL pass the schema for one selected
 * dataset.
 */
export function narrowOfflineSchema(
  schema: OfflineChatSchema,
  datasetId: string,
): OfflineChatSchema {
  const datasets = schema.datasets.filter(propEq("id", datasetId));
  const columns = schema.columns.filter(propEq("dataset_id", datasetId));
  return {
    datasets,
    columns,
    concepts: schema.concepts ?? [],
    conceptAttributes: schema.conceptAttributes ?? [],
    conceptStatuses: schema.conceptStatuses ?? [],
  };
}
