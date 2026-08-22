import { propEq } from "@avandar/utils";
import type { OfflineChatSchema } from "$/types/offlineChat.types";

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

  const hasOpen = args.schema.datasets.some(propEq("id", openDatasetId));
  if (hasOpen) {
    return args.schema;
  }

  const columns = args.schema.columns.filter(
    propEq("dataset_id", openDatasetId),
  );

  return {
    datasets: [
      ...args.schema.datasets,
      { id: openDatasetId, name: openDatasetId },
    ],
    columns,
    concepts: args.schema.concepts ?? [],
    conceptAttributes: args.schema.conceptAttributes ?? [],
  };
}
