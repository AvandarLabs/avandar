import type { OfflineChatSchema } from "$/types/offlineChat.types";

import { propEq } from "@avandar/utils";

/**
 * Restricts schema sent to the SQL pass so the model sees one dataset.
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
  };
}
