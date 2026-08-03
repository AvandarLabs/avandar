import type { OfflineChatSchema } from "./offlineChat.types";

/**
 * When the session schema cache is empty offline, still allow repair if the
 * user has a dataset open in Data Explorer.
 */
export function ensureOfflineChatSchema(args: {
  schema: OfflineChatSchema;
  openDatasetId?: string;
}): OfflineChatSchema {
  const openDatasetId = args.openDatasetId?.trim();
  if (!openDatasetId) {
    return args.schema;
  }

  const hasOpen = args.schema.datasets.some((dataset) => {
    return dataset.id === openDatasetId;
  });
  if (hasOpen) {
    return args.schema;
  }

  const columns = args.schema.columns.filter((column) => {
    return column.dataset_id === openDatasetId;
  });

  return {
    datasets: [
      ...args.schema.datasets,
      { id: openDatasetId, name: openDatasetId },
    ],
    columns,
  };
}
