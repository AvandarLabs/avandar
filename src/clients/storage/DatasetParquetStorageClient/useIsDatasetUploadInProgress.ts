import { useSyncExternalStore } from "react";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetUploadProgressStore } from "./DatasetUploadProgressStore";

/**
 * A hook that returns true when the dataset's Parquet upload is in-flight.
 */
export function useIsDatasetUploadInProgress(datasetId: DatasetId): boolean {
  // subscribe to the external store to trigger a re-render when the upload
  // status changes
  useSyncExternalStore(
    DatasetUploadProgressStore.subscribe,
    DatasetUploadProgressStore.getSnapshot,
    DatasetUploadProgressStore.getSnapshot,
  );

  // return the current upload status for the dataset
  return (
    DatasetUploadProgressStore.getInProgressUpload(datasetId) !== undefined
  );
}
