import { createExternalStore } from "@/lib/utils/state/createExternalStore";
import { DatasetId } from "@/models/datasets/Dataset";

type DatasetUploadStatus = "uploading" | "completed" | "error";

type UploadState = {
  status: DatasetUploadStatus;
  totalBytes: number;
  uploadedBytes: number;
  uploadPromise: Promise<void>;
  errorMessage?: string;
};

function _clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

export const DatasetUploadProgressStore = createExternalStore({
  initialState: new Map<DatasetId, UploadState>(),
  builder: (uploads: Map<DatasetId, UploadState>) => {
    return {
      getters: {
        getInProgressUpload: (
          datasetId: DatasetId,
        ): Promise<void> | undefined => {
          const uploadState = uploads.get(datasetId);
          if (!uploadState) {
            return undefined;
          }

          if (uploadState.status !== "uploading") {
            return undefined;
          }

          return uploadState.uploadPromise;
        },

        getUploadPercent: (datasetId: DatasetId): number | undefined => {
          const uploadState = uploads.get(datasetId);
          if (!uploadState) {
            return undefined;
          }

          if (uploadState.totalBytes <= 0) {
            return 0;
          }

          const percent =
            (uploadState.uploadedBytes / uploadState.totalBytes) * 100;
          return _clampPercent(percent);
        },
      },
      updaters: {
        startUpload: (
          datasetId: DatasetId,
          options: {
            totalBytes: number;
            uploadPromise: Promise<void>;
          },
        ): void => {
          uploads.set(datasetId, {
            status: "uploading",
            totalBytes: options.totalBytes,
            uploadedBytes: 0,
            uploadPromise: options.uploadPromise,
          });
        },

        setUploadedBytes: (
          datasetId: DatasetId,
          uploadedBytes: number,
        ): void => {
          const uploadState = uploads.get(datasetId);
          if (!uploadState) {
            return;
          }

          uploads.set(datasetId, {
            ...uploadState,
            uploadedBytes,
          });
        },

        markCompleted: (datasetId: DatasetId): void => {
          const uploadState = uploads.get(datasetId);
          if (!uploadState) {
            return;
          }

          uploads.set(datasetId, {
            ...uploadState,
            status: "completed",
            uploadedBytes: uploadState.totalBytes,
          });
        },

        markError: (datasetId: DatasetId, errorMessage: string): void => {
          const uploadState = uploads.get(datasetId);
          if (!uploadState) {
            return;
          }

          uploads.set(datasetId, {
            ...uploadState,
            status: "error",
            errorMessage,
          });
        },

        removeUpload: (datasetId: DatasetId): void => {
          uploads.delete(datasetId);
        },
      },
    };
  },
});
