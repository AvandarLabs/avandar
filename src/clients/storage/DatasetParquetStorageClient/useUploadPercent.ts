import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

import { useSyncExternalStore } from "react";

import { DatasetUploadProgressStore } from "@/clients/storage/DatasetParquetStorageClient/DatasetUploadProgressStore";

export function useUploadPercent(datasetId: DatasetId): number | undefined {
  // subscribe to the external store to trigger a re-render when the upload
  // status changes
  useSyncExternalStore(
    DatasetUploadProgressStore.subscribe,
    DatasetUploadProgressStore.getSnapshot,
    DatasetUploadProgressStore.getSnapshot,
  );
  return DatasetUploadProgressStore.getUploadPercent(datasetId);
}
