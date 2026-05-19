/*
 * Webview-side adapter that satisfies the platform-agnostic
 * `DatasetBlobStore` interface by routing every call through the
 * Bun-main blob IPC handlers (`apps/desktop/main/ipc/registerDatasetBlobHandlers/`).
 *
 * Ships in isolation for now: no React code imports it yet. Soon, the
 * `PlatformProvider` + `usePlatform()` plumbing will pick this adapter
 * for desktop builds and the existing Dexie-backed one for web.
 *
 * Bytes cross IPC as base64 strings. The interface promises a
 * `ReadableStream<Uint8Array>` from `get`, which is faithfully recreated
 * here from the base64-decoded bytes; in V1 the stream is materialised
 * eagerly because every consumer reads the parquet/source fully into
 * DuckDB anyway. Phase 3 may introduce a chunked variant for large
 * uploads.
 */

import { callIpc } from "$/platform/ipc/client";
import { DatasetBlobContracts } from "$/platform/ipc/contracts/DatasetBlobContracts";
import type {
  DatasetBlobKey,
  DatasetBlobStat,
  DatasetBlobStore,
} from "$/platform/types/DatasetBlobStore.types";

async function _readStreamToUint8Array(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value !== undefined) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function _uint8ToBase64(bytes: Uint8Array): string {
  /*
   * Chunked encode to keep `String.fromCharCode(...)` from blowing the
   * call-stack limit on large buffers. `btoa` only accepts strings of
   * char-codes < 256, which is what we feed it.
   */
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function _base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function _bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function put(
  key: DatasetBlobKey,
  bytes: Uint8Array | ReadableStream<Uint8Array>,
): Promise<void> {
  const buffer =
    bytes instanceof Uint8Array ? bytes : await _readStreamToUint8Array(bytes);
  await callIpc(DatasetBlobContracts.put, {
    key,
    bytesBase64: _uint8ToBase64(buffer),
  });
}

async function get(
  key: DatasetBlobKey,
): Promise<ReadableStream<Uint8Array>> {
  const reply = await callIpc(DatasetBlobContracts.get, { key });
  return _bytesToStream(_base64ToUint8(reply.bytesBase64));
}

async function deleteKey(key: DatasetBlobKey): Promise<void> {
  await callIpc(DatasetBlobContracts.delete, { key });
}

async function exists(key: DatasetBlobKey): Promise<boolean> {
  const reply = await callIpc(DatasetBlobContracts.exists, { key });
  return reply.exists;
}

async function list(
  prefix: DatasetBlobKey,
): Promise<readonly DatasetBlobKey[]> {
  const reply = await callIpc(DatasetBlobContracts.list, { prefix });
  return reply.keys as DatasetBlobKey[];
}

async function stat(key: DatasetBlobKey): Promise<DatasetBlobStat | null> {
  const reply = await callIpc(DatasetBlobContracts.stat, { key });
  return reply.stat;
}

/**
 * Desktop {@link DatasetBlobStore} implementation that routes through
 * IPC to the filesystem-backed Bun-main blob store.
 */
export const DesktopDatasetBlobStore: DatasetBlobStore = {
  put,
  get,
  delete: deleteKey,
  exists,
  list,
  stat,
};
