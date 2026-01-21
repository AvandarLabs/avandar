import { createExternalStore } from "@/lib/utils/state/createExternalStore";
import { DatasetId } from "@/models/datasets/Dataset";

export const DatasetUploadProgressStore = createExternalStore({
  initialState: new Map<DatasetId, Promise<void>>(),
  builder: (uploadsInProgress: Map<DatasetId, Promise<void>>) => {
    return {
      getters: {
        getInProgressUpload: (
          datasetId: DatasetId,
        ): Promise<void> | undefined => {
          return uploadsInProgress.get(datasetId);
        },
      },
      updaters: {
        addUpload: (
          datasetId: DatasetId,
          uploadPromise: Promise<void>,
        ): void => {
          uploadsInProgress.set(datasetId, uploadPromise);
        },

        removeUpload: (datasetId: DatasetId): void => {
          uploadsInProgress.delete(datasetId);
        },
      },
    };
  },
});
