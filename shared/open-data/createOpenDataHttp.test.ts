import { describe, expect, it, vi } from "vitest";
import { createOpenDataHttp } from "$/open-data/createOpenDataHttp.ts";
import type { FetchLike } from "$/open-data/createOpenDataHttp.ts";

const URL_UNDER_TEST = "https://data.humdata.org/api/3/action/package_show?id=x";

/** A presigned redirect target, which must never reach a message or a log. */
const PRESIGNED_URL =
  "https://s3.us-east-1.amazonaws.com/hdx/x.csv?Signature=SECRET";

function _bytesResponse(
  bytes: Uint8Array,
  options: { declaredLength?: string | undefined; status?: number } = {},
): Response {
  const headers = new Headers();
  if (options.declaredLength !== undefined) {
    headers.set("content-length", options.declaredLength);
  }
  const response = new Response(bytes as BodyInit, {
    status: options.status ?? 200,
    headers,
  });
  // `fetch` reports the final URL after redirects, so the object below carries
  // the presigned one exactly as a real response would.
  Object.defineProperty(response, "url", { value: PRESIGNED_URL });
  return response;
}

/** Streams `bytes` in small chunks, so the reading guard sees more than one. */
function _chunkedResponse(bytes: Uint8Array, chunkSize: number): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
        controller.enqueue(bytes.subarray(offset, offset + chunkSize));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("createOpenDataHttp.getJson", () => {
  it("parses a JSON body", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    expect(
      await createOpenDataHttp({ maxBytes: 1000, fetchImpl }).getJson(
        URL_UNDER_TEST,
      ),
    ).toEqual({ success: true });
  });

  it("raises on a non-2xx status, naming the status", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("nope", { status: 403 });
    });

    await expect(
      createOpenDataHttp({ maxBytes: 1000, fetchImpl }).getJson(URL_UNDER_TEST),
    ).rejects.toThrow(/403/);
  });
});

describe("createOpenDataHttp.getBytes", () => {
  it("returns the body bytes", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1, 2, 3]));
    });

    const bytes = await createOpenDataHttp({
      maxBytes: 1000,
      fetchImpl,
    }).getBytes(URL_UNDER_TEST);

    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("follows redirects, since a CKAN download answers with one", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]));
    });

    await createOpenDataHttp({ maxBytes: 1000, fetchImpl }).getBytes(
      URL_UNDER_TEST,
    );

    expect(fetchImpl).toHaveBeenCalledWith(URL_UNDER_TEST, {
      redirect: "follow",
    });
  });

  it("refuses a body whose declared length is over the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1, 2, 3]), {
        declaredLength: "5000",
      });
    });

    await expect(
      createOpenDataHttp({ maxBytes: 1000, fetchImpl }).getBytes(
        URL_UNDER_TEST,
      ),
    ).rejects.toThrow(/5000 bytes, above the 1000 byte limit/);
  });

  // The declared length is a claim, not a fact. A response that under-declares
  // must still be bounded, which is why the read is guarded as well.
  it("refuses a body that exceeds the limit while streaming, despite a small declared length", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      const response = _chunkedResponse(new Uint8Array(3000), 500);
      response.headers.set("content-length", "10");
      return response;
    });

    await expect(
      createOpenDataHttp({ maxBytes: 1000, fetchImpl }).getBytes(
        URL_UNDER_TEST,
      ),
    ).rejects.toThrow(/exceeded the 1000 byte limit/);
  });

  it("refuses an undeclared body that exceeds the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(3000), 500);
    });

    await expect(
      createOpenDataHttp({ maxBytes: 1000, fetchImpl }).getBytes(
        URL_UNDER_TEST,
      ),
    ).rejects.toThrow(/exceeded the 1000 byte limit/);
  });

  it("reassembles a chunked body in order", async () => {
    const source = new Uint8Array([10, 20, 30, 40, 50, 60, 70]);
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(source, 3);
    });

    const bytes = await createOpenDataHttp({
      maxBytes: 1000,
      fetchImpl,
    }).getBytes(URL_UNDER_TEST);

    expect(Array.from(bytes)).toEqual(Array.from(source));
  });

  it("accepts a body exactly at the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(1000), 250);
    });

    const bytes = await createOpenDataHttp({
      maxBytes: 1000,
      fetchImpl,
    }).getBytes(URL_UNDER_TEST);

    expect(bytes.byteLength).toBe(1000);
  });

  it("returns empty bytes for a body-less response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response(null, { status: 200 });
    });

    const bytes = await createOpenDataHttp({
      maxBytes: 1000,
      fetchImpl,
    }).getBytes(URL_UNDER_TEST);

    expect(bytes.byteLength).toBe(0);
  });

  // After redirects `response.url` is the presigned object-store URL, which
  // is a credential. No message raised here may repeat it.
  it("names no presigned URL when it refuses an oversized body", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]), { declaredLength: "5000" });
    });

    const error = await createOpenDataHttp({ maxBytes: 1000, fetchImpl })
      .getBytes(URL_UNDER_TEST)
      .catch((caught: unknown) => {
        return caught;
      });

    expect((error as Error).message).not.toContain("Signature");
    expect((error as Error).message).not.toContain("amazonaws");
  });

  it("raises on a non-2xx status, naming the status", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]), { status: 502 });
    });

    await expect(
      createOpenDataHttp({ maxBytes: 1000, fetchImpl }).getBytes(
        URL_UNDER_TEST,
      ),
    ).rejects.toThrow(/502/);
  });
});
