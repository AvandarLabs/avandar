import { base64ToUint8, uint8ToBase64 } from "@avandar/utils/encoding";
import { callIpc } from "$/platform/ipc/client.ts";
import { DatasetBlobContracts } from "$/platform/ipc/contracts/DatasetBlobContracts.ts";
import type {
  DatasetBlobKey,
  DatasetBlobStat,
  DatasetBlobStore,
} from "$/platform/types/DatasetBlobStore.types.ts";

/** Drains a byte stream to completion and concatenates it into one array. */
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
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return out;
}

/** Wraps a byte array in a single-chunk readable stream. */
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
    bytesBase64: uint8ToBase64(buffer),
  });
}

async function get(key: DatasetBlobKey): Promise<ReadableStream<Uint8Array>> {
  const reply = await callIpc(DatasetBlobContracts.get, { key });
  return _bytesToStream(base64ToUint8(reply.bytesBase64));
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
 * IPC to the filesystem-backed Bun-main blob store. Bytes cross IPC as
 * base64 and `get` recreates the promised readable stream eagerly.
 */
export const DesktopDatasetBlobStore: DatasetBlobStore = {
  put,
  get,
  delete: deleteKey,
  exists,
  list,
  stat,
};
