import { AvaDexie } from "@/db/dexie/AvaDexie";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import {
  asDatasetBlobKey,
  type DatasetBlobKey,
  type DatasetBlobStat,
  type DatasetBlobStore,
} from "$/platform/types/DatasetBlobStore.types";

/**
 * Web-side adapter that maps the platform-agnostic `DatasetBlobStore`
 * interface onto the existing Dexie-backed `LocalDataset` table.
 *
 * Today only the canonical `data.parquet` key kind is meaningful on web:
 * the Dexie row stores the transcoded parquet bytes (`parquetData`)
 * alongside the dataset metadata. `source.<ext>` and `meta.json` keys
 * are desktop-only (the filesystem blob store covers them); the web
 * adapter rejects them loudly so a migrated caller surfaces the gap
 * instead of silently dropping bytes.
 */

type ParsedKey = {
  workspaceId: string;
  datasetId: DatasetId;
  kind: "parquet";
};

const PARQUET_KEY_RE =
  /^workspaces\/([^/]+)\/datasets\/([^/]+)\/data\.parquet$/;

function _parseKey(key: DatasetBlobKey): ParsedKey {
  const match = PARQUET_KEY_RE.exec(key);
  if (match === null) {
    throw new Error(
      `createWebDatasetBlobStore: unsupported key "${key}". The web ` +
        "adapter only handles `workspaces/<wsId>/datasets/<dsId>/data.parquet` " +
        "today; `source.<ext>` and `meta.json` are desktop-only.",
    );
  }
  const [, workspaceId, datasetId] = match;
  return {
    workspaceId: workspaceId ?? "",
    datasetId: (datasetId ?? "") as DatasetId,
    kind: "parquet",
  };
}

async function _bytesToBlob(
  bytes: Uint8Array | ReadableStream<Uint8Array>,
): Promise<Blob> {
  // `Blob` constructor accepts `BlobPart[]`, which requires an
  // `ArrayBufferView<ArrayBuffer>`. The `Uint8Array<ArrayBufferLike>`
  // we receive may technically be backed by a `SharedArrayBuffer`, so
  // copy the bytes into a fresh `ArrayBuffer`-backed view first.
  if (bytes instanceof Uint8Array) {
    return new Blob([new Uint8Array(bytes).buffer]);
  }
  const chunks: ArrayBuffer[] = [];
  const reader = bytes.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value !== undefined) {
      chunks.push(new Uint8Array(value).buffer);
    }
  }
  return new Blob(chunks);
}

function _blobToStream(blob: Blob): ReadableStream<Uint8Array> {
  // `Blob.stream()` returns a `ReadableStream<Uint8Array>` in every
  // modern browser; cast through `unknown` because the lib.dom type
  // declares the chunk type as `any`.
  return blob.stream() as unknown as ReadableStream<Uint8Array>;
}

async function put(
  key: DatasetBlobKey,
  bytes: Uint8Array | ReadableStream<Uint8Array>,
): Promise<void> {
  const parsed = _parseKey(key);
  const blob = await _bytesToBlob(bytes);
  const existing = await AvaDexie.DB.LocalDataset.get(parsed.datasetId);
  if (existing === undefined) {
    throw new Error(
      `createWebDatasetBlobStore.put: no LocalDataset row exists for ` +
        `datasetId "${parsed.datasetId}". Create the row first; this ` +
        "adapter only attaches parquet bytes to an existing dataset.",
    );
  }
  await AvaDexie.DB.LocalDataset.update(parsed.datasetId, {
    parquetData: blob,
    parseStatus: "ready",
  });
}

async function get(key: DatasetBlobKey): Promise<ReadableStream<Uint8Array>> {
  const parsed = _parseKey(key);
  const row = await AvaDexie.DB.LocalDataset.get(parsed.datasetId);
  if (row?.parquetData === undefined) {
    throw new Error(
      `createWebDatasetBlobStore.get: no parquet bytes stored for ` +
        `datasetId "${parsed.datasetId}".`,
    );
  }
  return _blobToStream(row.parquetData);
}

async function deleteKey(key: DatasetBlobKey): Promise<void> {
  const parsed = _parseKey(key);
  const existing = await AvaDexie.DB.LocalDataset.get(parsed.datasetId);
  if (existing === undefined) {
    return;
  }
  await AvaDexie.DB.LocalDataset.update(parsed.datasetId, {
    parquetData: undefined,
  });
}

async function exists(key: DatasetBlobKey): Promise<boolean> {
  const parsed = _parseKey(key);
  const row = await AvaDexie.DB.LocalDataset.get(parsed.datasetId);
  return row?.parquetData !== undefined;
}

async function list(
  prefix: DatasetBlobKey,
): Promise<readonly DatasetBlobKey[]> {
  // Dexie isn't a prefix tree, so this is a linear scan. Acceptable in
  // V1 — only a handful of datasets per workspace at this size; if the
  // count grows, swap to a `workspaceId`-indexed query.
  const all = await AvaDexie.DB.LocalDataset.toArray();
  const out: DatasetBlobKey[] = [];
  for (const row of all) {
    if (row.parquetData === undefined) {
      continue;
    }
    const candidate = asDatasetBlobKey(
      `workspaces/${row.workspaceId}/datasets/${row.datasetId}/data.parquet`,
    );
    if (candidate.startsWith(prefix)) {
      out.push(candidate);
    }
  }
  return out;
}

async function stat(key: DatasetBlobKey): Promise<DatasetBlobStat | null> {
  const parsed = _parseKey(key);
  const row = await AvaDexie.DB.LocalDataset.get(parsed.datasetId);
  if (row?.parquetData === undefined) {
    return null;
  }
  return {
    sizeBytes: row.parquetData.size,
    // Dexie rows have no native mtime; the closest analogue is
    // `parseStartedAt` (set when Phase B begins). Fall back to `Date.now()`
    // so callers that only check freshness get a sane value.
    mtimeMs: row.parseStartedAt ?? Date.now(),
  };
}

/**
 * Builds the web {@link DatasetBlobStore} adapter. Wraps the existing
 * Dexie `LocalDataset` table so consumers reached through
 * `usePlatform().datasetBlobStore` see the same parquet bytes the
 * legacy paths cache today.
 */
export function createWebDatasetBlobStore(): DatasetBlobStore {
  return {
    put,
    get,
    delete: deleteKey,
    exists,
    list,
    stat,
  };
}
