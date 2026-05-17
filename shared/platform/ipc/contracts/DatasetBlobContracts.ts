import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

/**
 * Filesystem-backed `DatasetBlobStore` contracts. Bytes are transported as
 * base64 strings over Electrobun's stdin/stdout IPC; for files >50MB Phase
 * 3 may introduce a streaming variant. The Bun-main handlers live in
 * `apps/desktop/main/ipc/dataset-blob.ts` and call into
 * `apps/desktop/main/services/FileSystemDatasetBlobStore.ts` (Phase 2 Task
 * 12).
 */
export const DatasetBlobContracts = {
  put: defineIpcContract<
    { key: string; bytesBase64: string },
    { bytesWritten: number }
  >("datasetBlob.put"),
  get: defineIpcContract<{ key: string }, { bytesBase64: string }>(
    "datasetBlob.get",
  ),
  delete: defineIpcContract<{ key: string }, { deleted: boolean }>(
    "datasetBlob.delete",
  ),
  exists: defineIpcContract<{ key: string }, { exists: boolean }>(
    "datasetBlob.exists",
  ),
  list: defineIpcContract<{ prefix: string }, { keys: string[] }>(
    "datasetBlob.list",
  ),
  stat: defineIpcContract<
    { key: string },
    {
      // null (not undefined) because the JSON wire envelope drops undefined
      // properties, and matches the Phase 1 `DatasetBlobStore.stat` return.
      stat: {
        sizeBytes: number;
        mtimeMs: number;
      } | null;
    }
  >("datasetBlob.stat"),
} as const;
