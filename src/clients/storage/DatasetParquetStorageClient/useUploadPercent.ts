import { useSyncExternalStore } from "react";
import { DatasetUploadProgressStore } from "./DatasetUploadProgressStore";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

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
