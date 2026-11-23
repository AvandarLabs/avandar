import { HttpClientError } from "$/utils/HttpClientFactory/HttpClientError.ts";
import type { HttpMethod } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

async function _readStreamWithLimit(params: {
  body: ReadableStream<Uint8Array>;
  maxBytes: number;
  method: HttpMethod;
}): Promise<Uint8Array<ArrayBuffer>> {
  const { body, maxBytes, method } = params;
  const reader = body.getReader();
  const chunks: Array<Uint8Array<ArrayBuffer>> = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        throw new HttpClientError({
          kind: "responseTooLarge",
          method,
          maxBytes,
        });
      }
      // A stream's chunk type is `Uint8Array<ArrayBufferLike>`, but `fetch`
      // body streams are backed by `ArrayBuffer`, so the narrower type holds.
      chunks.push(value as Uint8Array<ArrayBuffer>);
    }
  } finally {
    // Releasing the lock lets the caller cancel the underlying connection
    // rather than leaving a half-read body open after an over-limit abort.
    reader.releaseLock();
  }
  const bytes = new Uint8Array(new ArrayBuffer(total));
  chunks.reduce((offset, chunk) => {
    bytes.set(chunk, offset);
    return offset + chunk.byteLength;
  }, 0);
  return bytes;
}

/**
 * Reads a response body, refusing more than `maxBytes`. The declared
 * `content-length` is checked first, and the streamed read is checked again,
 * because a response can declare a small length and send more.
 *
 * Streaming rather than `arrayBuffer()` is the point: `arrayBuffer()` would
 * buffer an oversized body in full before anyone could object.
 */
export async function readBoundedBody(params: {
  response: Response;
  maxBytes: number;
  method: HttpMethod;
}): Promise<Uint8Array<ArrayBuffer>> {
  const { response, maxBytes, method } = params;
  const declaredBytes = Number(
    response.headers.get("content-length") ?? Number.NaN,
  );
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new HttpClientError({
      kind: "responseTooLarge",
      method,
      maxBytes,
      declaredBytes,
    });
  }
  if (!response.body) {
    return new Uint8Array(new ArrayBuffer(0));
  }
  return await _readStreamWithLimit({ body: response.body, maxBytes, method });
}
