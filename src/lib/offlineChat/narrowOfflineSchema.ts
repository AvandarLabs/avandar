import type { OfflineChatSchema } from "./offlineChat.types";

/**
 * Restricts schema sent to the SQL pass so the model sees one dataset.
 */
export function narrowOfflineSchema(
  schema: OfflineChatSchema,
  datasetId: string,
): OfflineChatSchema {
  const datasets = schema.datasets.filter((dataset) => {
    return dataset.id === datasetId;
  });
  const columns = schema.columns.filter((column) => {
    return column.dataset_id === datasetId;
  });
  return { datasets, columns };
}
