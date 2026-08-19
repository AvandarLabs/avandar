import type { OpenDataHttp } from "$/open-data/CkanClient/CkanClient.types.ts";

/** A `fetch` implementation, injected so tests need no network. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

type OpenDataHttpOptions = {
  /**
   * The largest byte payload to read. Enforced twice: against the declared
   * `Content-Length`, and again while reading, because a response that declares
   * a small length can still send more.
   */
  maxBytes: number;

  /** Injected so a test drives every branch without a network. */
  fetchImpl?: FetchLike;
};

/**
 * Reads a response body, aborting once more than `maxBytes` have arrived.
 *
 * Streaming rather than `arrayBuffer()` is the point: `arrayBuffer()` would
 * buffer an oversized body in full before anyone could object, which is the
 * failure this guard exists to prevent. A response declaring no length, or
 * declaring a false one, is therefore still bounded.
 */
async function _readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const body = response.body;
  if (!body) {
    return new Uint8Array(new ArrayBuffer(0));
  }
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
        throw new Error(
          `Open data response exceeded the ${maxBytes} byte limit.`,
        );
      }
      chunks.push(value as Uint8Array<ArrayBuffer>);
    }
  } finally {
    // Releasing the lock lets the caller cancel the underlying connection
    // rather than leaving a half-read body open after an over-limit abort.
    reader.releaseLock();
  }

  const bytes = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Builds the HTTP layer an open data read needs, over plain `fetch`.
 *
 * Works unchanged in Deno, in Node and in a browser, which is why it lives here
 * rather than beside a server route: the same reader is correct on either side
 * of a proxy, and only where it runs differs.
 *
 * No error raised here names a URL. After redirects are followed `response.url`
 * is the object store's presigned URL, which is a credential, so it must not
 * reach a message or a log line.
 */
export function createOpenDataHttp(
  options: Readonly<OpenDataHttpOptions>,
): OpenDataHttp {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    getJson: async (url: string): Promise<unknown> => {
      const response = await fetchImpl(url, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(
          `Open data metadata request failed with status ${response.status}.`,
        );
      }
      return await response.json();
    },

    getBytes: async (url: string): Promise<Uint8Array<ArrayBuffer>> => {
      const response = await fetchImpl(url, { redirect: "follow" });
      if (!response.ok) {
        throw new Error(
          `Open data byte request failed with status ${response.status}.`,
        );
      }
      const declaredLength = Number(
        response.headers.get("content-length") ?? Number.NaN,
      );
      if (
        Number.isFinite(declaredLength) &&
        declaredLength > options.maxBytes
      ) {
        throw new Error(
          `Open data response declared ${declaredLength} bytes, above the ${options.maxBytes} byte limit.`,
        );
      }
      return await _readBoundedBody(response, options.maxBytes);
    },
  };
}
