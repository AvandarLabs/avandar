import type {
  OfflineChatSchema,
  OfflineChatSchemaColumn,
  OfflineChatSchemaDataset,
} from "./offlineChat.types";

const MAX_DATASETS = 12;
const MAX_COLUMNS_TOTAL = 80;
const MAX_COLUMNS_PER_DATASET = 24;

/**
 * Caps schema size so offline prefill stays within WebLLM context on 8 GB
 * machines. Prefers columns from `preferredDatasetId` when set.
 */
export function truncateSchemaForOffline(
  schema: OfflineChatSchema,
  preferredDatasetId?: string,
): OfflineChatSchema {
  const datasets = schema.datasets.slice(0, MAX_DATASETS);

  const columnsByDataset = new Map<string, OfflineChatSchemaColumn[]>();
  for (const column of schema.columns) {
    const bucket = columnsByDataset.get(column.dataset_id) ?? [];
    bucket.push(column);
    columnsByDataset.set(column.dataset_id, bucket);
  }

  const hasPreferred =
    preferredDatasetId !== undefined &&
    datasets.some((dataset) => {
      return dataset.id === preferredDatasetId;
    });

  const orderedDatasetIds =
    hasPreferred ?
      [
        preferredDatasetId,
        ...datasets
          .map((dataset) => {
            return dataset.id;
          })
          .filter((id) => {
            return id !== preferredDatasetId;
          }),
      ]
    : datasets.map((dataset) => {
        return dataset.id;
      });

  const columns: OfflineChatSchemaColumn[] = [];
  for (const datasetId of orderedDatasetIds) {
    if (columns.length >= MAX_COLUMNS_TOTAL) {
      break;
    }
    const bucket = columnsByDataset.get(datasetId) ?? [];
    const slice = bucket.slice(0, MAX_COLUMNS_PER_DATASET);
    for (const column of slice) {
      if (columns.length >= MAX_COLUMNS_TOTAL) {
        break;
      }
      columns.push(column);
    }
  }

  const datasetIdSet = new Set(
    columns.map((column) => {
      return column.dataset_id;
    }),
  );
  const trimmedDatasets: OfflineChatSchemaDataset[] = datasets.filter((d) => {
    return datasetIdSet.has(d.id);
  });

  return { datasets: trimmedDatasets, columns };
}
