/**
 * Platform-agnostic store for dataset bulk data (parquet files, raw source
 * uploads). On web this wraps Dexie + optional Supabase Storage. On desktop
 * (Phase 2+) this wraps the local filesystem under the per-OS-user app data
 * directory.
 */
export interface DatasetBlobStore {
  /**
   * Writes `bytes` to `key`, overwriting any existing blob. Accepts either a
   * materialized `Uint8Array` or a `ReadableStream` that is drained in full.
   */
  put(
    key: DatasetBlobKey,
    bytes: Uint8Array | ReadableStream<Uint8Array>,
  ): Promise<void>;
  /** Reads the blob at `key` as a stream of its bytes. */
  get(key: DatasetBlobKey): Promise<ReadableStream<Uint8Array>>;
  /** Removes the blob at `key`. */
  delete(key: DatasetBlobKey): Promise<void>;
  /** Returns whether a blob is currently stored at `key`. */
  exists(key: DatasetBlobKey): Promise<boolean>;
  /** Returns every stored blob key that begins with `prefix`. */
  list(prefix: DatasetBlobKey): Promise<readonly DatasetBlobKey[]>;
  /** Returns size and mtime for the blob at `key`, or null if it is absent. */
  stat(key: DatasetBlobKey): Promise<DatasetBlobStat | null>;
}

/**
 * Branded blob-store key. Construct via {@link asDatasetBlobKey} or the
 * helpers on {@link DatasetBlobKeys}.
 */
export type DatasetBlobKey = string & { readonly __brand: "DatasetBlobKey" };

/**
 * Metadata returned by {@link DatasetBlobStore.stat}.
 */
export type DatasetBlobStat = {
  readonly sizeBytes: number;
  readonly mtimeMs: number;
};

/**
 * Cast a plain string into a branded {@link DatasetBlobKey}. Runtime value
 * unchanged; prefer the structured helpers on {@link DatasetBlobKeys} when
 * the key follows the standard workspace/dataset layout.
 *
 * @param key - Raw key string.
 * @returns The same string typed as a {@link DatasetBlobKey}.
 */
export function asDatasetBlobKey(key: string): DatasetBlobKey {
  return key as DatasetBlobKey;
}

/**
 * Helpers for assembling well-formed keys following the canonical
 * `workspaces/<workspaceId>/datasets/<datasetId>/...` layout. Used by both
 * the web and desktop backends so they stay schema-compatible.
 */
export const DatasetBlobKeys = {
  source: (
    workspaceId: string,
    datasetId: string,
    ext: string,
  ): DatasetBlobKey => {
    return asDatasetBlobKey(
      `workspaces/${workspaceId}/datasets/${datasetId}/source.${ext}`,
    );
  },
  parquet: (workspaceId: string, datasetId: string): DatasetBlobKey => {
    return asDatasetBlobKey(
      `workspaces/${workspaceId}/datasets/${datasetId}/data.parquet`,
    );
  },
  meta: (workspaceId: string, datasetId: string): DatasetBlobKey => {
    return asDatasetBlobKey(
      `workspaces/${workspaceId}/datasets/${datasetId}/meta.json`,
    );
  },
};
