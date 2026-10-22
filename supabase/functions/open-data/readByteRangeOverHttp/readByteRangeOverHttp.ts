import type { ReadByteRange } from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";

/** How long reading one sample may take before it counts as failed. */
const READ_TIMEOUT_MS = 30_000;

async function _readAtMost(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  while (byteCount < maxBytes) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    byteCount += value.byteLength;
  }
  await reader.cancel();
  const bytes = new Uint8Array(Math.min(byteCount, maxBytes));
  let offset = 0;
  chunks.forEach((chunk) => {
    const take = Math.min(chunk.byteLength, bytes.byteLength - offset);
    bytes.set(chunk.subarray(0, take), offset);
    offset += take;
  });
  return bytes;
}

/**
 * Creates a `ReadByteRange` over `fetch`. It asks for the first `maxBytes`
 * with a `Range` header and follows redirects, and stops reading at
 * `maxBytes` even when the server ignores the range and sends the whole file.
 *
 * @param fetchImpl - Replaces `fetch`, for tests.
 */
export function createByteRangeReader(
  fetchImpl: typeof fetch = fetch,
): ReadByteRange {
  return async ({ url, maxBytes }) => {
    const response = await fetchImpl(url, {
      headers: { Range: `bytes=0-${maxBytes - 1}` },
      redirect: "follow",
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
    if (!response.ok || response.body === null) {
      throw new Error(`Reading ${url} failed with HTTP ${response.status}`);
    }
    return await _readAtMost(response.body, maxBytes);
  };
}
