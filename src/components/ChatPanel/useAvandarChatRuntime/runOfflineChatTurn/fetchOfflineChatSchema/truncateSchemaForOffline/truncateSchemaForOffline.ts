import { makeBucketMap, prop, propEq } from "@utils";
import type {
  OfflineChatSchema,
  OfflineChatSchemaDataset,
} from "$/types/offlineChat.types";

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

  const columnsByDataset = makeBucketMap(schema.columns, {
    key: "dataset_id",
  });

  const hasPreferred =
    preferredDatasetId !== undefined &&
    datasets.some(propEq("id", preferredDatasetId));

  const orderedDatasetIds =
    hasPreferred ?
      [
        preferredDatasetId,
        ...datasets.map(prop("id")).filter((id) => {
          return id !== preferredDatasetId;
        }),
      ]
    : datasets.map(prop("id"));

  const columns = orderedDatasetIds
    .flatMap((datasetId) => {
      return (columnsByDataset.get(datasetId) ?? []).slice(
        0,
        MAX_COLUMNS_PER_DATASET,
      );
    })
    .slice(0, MAX_COLUMNS_TOTAL);

  const datasetIdSet = new Set(
    columns.map((column) => {
      return column.dataset_id;
    }),
  );
  // Keep dataset labels for table resolution when column metadata is empty.
  const trimmedDatasets: OfflineChatSchemaDataset[] =
    datasetIdSet.size > 0 ?
      datasets.filter((dataset) => {
        return datasetIdSet.has(dataset.id);
      })
    : datasets;

  return { datasets: trimmedDatasets, columns };
}
