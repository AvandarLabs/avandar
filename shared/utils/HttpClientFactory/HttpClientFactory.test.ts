import { describe, expect, it, vi } from "vitest";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import type {
  FetchLike,
  HttpClientState,
  HttpMiddleware,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

const BASE_URL = "https://api.example.org";

/** A presigned redirect target, which must never reach a message or a log. */
const PRESIGNED_URL =
  "https://s3.us-east-1.amazonaws.com/hdx/x.csv?Signature=SECRET";

function _jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function _bytesResponse(
  bytes: Uint8Array,
  options: { declaredLength?: string; status?: number } = {},
): Response {
  const headers = new Headers();
  if (options.declaredLength !== undefined) {
    headers.set("content-length", options.declaredLength);
  }
  const response = new Response(bytes as BodyInit, {
    status: options.status ?? 200,
    headers,
  });
  // `fetch` reports the final URL after redirects, so this carries the
  // presigned one exactly as a real response would.
  Object.defineProperty(response, "url", { value: PRESIGNED_URL });
  return response;
}

/** Streams `bytes` in small chunks, so the size guard sees more than one. */
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

function _createClient(
  fetchImpl: FetchLike,
  state: Partial<HttpClientState> = {},
) {
  return HttpClientFactory.create("TestHttpClient", {
    state: { maxResponseBytes: 1000, fetchImpl, ...state },
  });
}

function _requestedUrl(fetchImpl: FetchLike, callIndex = 0): string {
  return String(vi.mocked(fetchImpl).mock.calls[callIndex]?.[0]);
}

function _requestedHeaders(fetchImpl: FetchLike, callIndex = 0): Headers {
  return new Headers(vi.mocked(fetchImpl).mock.calls[callIndex]?.[1]?.headers);
}

describe("HttpClient: URLs and bodies", () => {
  it("get returns the parsed JSON body", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({ success: true });
    });
    expect(await _createClient(fetchImpl).get(`${BASE_URL}/x`)).toEqual({
      success: true,
    });
  });

  it("resolves a relative URL against baseUrl", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL }).get("/api/items");
    expect(_requestedUrl(fetchImpl)).toBe(`${BASE_URL}/api/items`);
  });

  it("sends an absolute URL to its own host, ignoring baseUrl", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL }).get(
      "https://other.example.com/data",
    );
    expect(_requestedUrl(fetchImpl)).toBe("https://other.example.com/data");
  });

  it("adds query parameters and leaves out undefined ones", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL }).get("/search", {
      query: { q: "measles", limit: 10, cursor: undefined },
    });
    expect(_requestedUrl(fetchImpl)).toBe(
      `${BASE_URL}/search?q=measles&limit=10`,
    );
  });

  it("post sends its body JSON-encoded with a JSON content type", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl).post(`${BASE_URL}/items`, {
      body: { name: "a" },
    });
    const init = vi.mocked(fetchImpl).mock.calls[0]?.[1];
    expect([
      init?.body,
      _requestedHeaders(fetchImpl).get("content-type"),
    ]).toEqual(['{"name":"a"}', "application/json"]);
  });

  it("delete returns undefined for a 204 response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response(null, { status: 204 });
    });
    expect(await _createClient(fetchImpl).delete(`${BASE_URL}/items/1`)).toBe(
      undefined,
    );
  });

  it("raises an HttpClientError naming the status on a non-2xx response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("nope", { status: 403 });
    });
    await expect(_createClient(fetchImpl).get(`${BASE_URL}/x`)).rejects.toThrow(
      /status 403/,
    );
  });

  it("refuses a JSON body over the size limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(3000), 500);
    });
    await expect(_createClient(fetchImpl).get(`${BASE_URL}/x`)).rejects.toThrow(
      /exceeded the 1000 byte limit/,
    );
  });
});

describe("HttpClient: auth", () => {
  it("sends a bearer token to baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).get("/x");
    expect(_requestedHeaders(fetchImpl).get("authorization")).toBe(
      "Bearer t0k",
    );
  });

  it("sends an API key header to baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "apiKeyHeader", headerName: "X-App-Token", apiKey: "k" },
    }).get("/x");
    expect(_requestedHeaders(fetchImpl).get("x-app-token")).toBe("k");
  });

  it("adds an API key query parameter for baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "apiKeyQuery", paramName: "api_key", apiKey: "k" },
    }).get("/x");
    expect(_requestedUrl(fetchImpl)).toBe(`${BASE_URL}/x?api_key=k`);
  });

  it("sends no credentials to another origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).get("https://other.example.com/x");
    expect(_requestedHeaders(fetchImpl).has("authorization")).toBe(false);
  });

  it("drops credentials when baseUrl's origin redirects to another origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async (url: string) => {
      return url.startsWith(BASE_URL)
        ? new Response(null, {
            status: 302,
            headers: { location: PRESIGNED_URL },
          })
        : _bytesResponse(new Uint8Array([1]));
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).getBytes("/download");
    expect(_requestedHeaders(fetchImpl, 1).has("authorization")).toBe(false);
  });

  it("keeps credentials across a redirect within baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async (url: string) => {
      return url.endsWith("/old")
        ? new Response(null, { status: 301, headers: { location: "/new" } })
        : _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).get("/old");
    expect(_requestedHeaders(fetchImpl, 1).get("authorization")).toBe(
      "Bearer t0k",
    );
  });

  it("sends the GET that follows a 303 after a POST with no body and no content type", async () => {
    const fetchImpl: FetchLike = vi.fn(async (url: string) => {
      return url.includes("/submit")
        ? new Response(null, { status: 303, headers: { location: "/done" } })
        : _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).post("/submit", { body: { name: "a" } });
    const followUpInit = vi.mocked(fetchImpl).mock.calls[1]?.[1];
    expect(followUpInit?.method).toBe("GET");
    expect(followUpInit?.body).toBeUndefined();
    expect(_requestedHeaders(fetchImpl, 1).has("content-type")).toBe(false);
  });

  it("throws when created with auth but no baseUrl", () => {
    const fetchImpl: FetchLike = vi.fn();
    expect(() => {
      _createClient(fetchImpl, { auth: { type: "bearer", token: "t0k" } });
    }).toThrow(/auth but no baseUrl/);
  });
});

describe("HttpClient: middlewares", () => {
  it("runs middlewares with the first one outermost", async () => {
    const order: string[] = [];
    const record = (label: string): HttpMiddleware => {
      return async (request, next) => {
        order.push(`${label}:before`);
        const response = await next(request);
        order.push(`${label}:after`);
        return response;
      };
    };
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      middlewares: [record("outer"), record("inner")],
    }).get(`${BASE_URL}/x`);
    expect(order).toEqual([
      "outer:before",
      "inner:before",
      "inner:after",
      "outer:after",
    ]);
  });

  it("never shows a middleware the request's credentials", async () => {
    let seenAuthorization: string | null = "unset";
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
      middlewares: [
        (request, next) => {
          seenAuthorization = request.headers.get("authorization");
          return next(request);
        },
      ],
    }).get("/x");
    expect(seenAuthorization).toBe(null);
  });
});

describe("HttpClient: getBytes", () => {
  it("returns the body bytes", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1, 2, 3]));
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("lets fetch follow redirects, since a CKAN download answers with one", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]));
    });
    await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(vi.mocked(fetchImpl).mock.calls[0]?.[1]?.redirect).toBe("follow");
  });

  it("refuses a body whose declared length is over the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1, 2, 3]), {
        declaredLength: "5000",
      });
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/5000 bytes, above the 1000 byte limit/);
  });

  // The declared length is a claim, not a fact, so the read is guarded too.
  it("refuses a body that exceeds the limit while streaming, despite a small declared length", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      const response = _chunkedResponse(new Uint8Array(3000), 500);
      response.headers.set("content-length", "10");
      return response;
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/exceeded the 1000 byte limit/);
  });

  it("refuses an undeclared body that exceeds the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(3000), 500);
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/exceeded the 1000 byte limit/);
  });

  it("reassembles a chunked body in order", async () => {
    const source = new Uint8Array([10, 20, 30, 40, 50, 60, 70]);
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(source, 3);
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(Array.from(bytes)).toEqual(Array.from(source));
  });

  it("accepts a body exactly at the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(1000), 250);
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(bytes.byteLength).toBe(1000);
  });

  it("returns empty bytes for a body-less response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response(null, { status: 200 });
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(bytes.byteLength).toBe(0);
  });

  // After redirects `response.url` is the presigned object-store URL, which
  // is a credential. No message raised here may repeat it.
  it("names no presigned URL when it refuses an oversized body", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]), { declaredLength: "5000" });
    });
    const error = await _createClient(fetchImpl)
      .getBytes(`${BASE_URL}/f`)
      .catch((caught: unknown) => {
        return caught;
      });
    expect((error as Error).message).not.toMatch(/Signature|amazonaws/);
  });

  it("raises an HttpClientError naming the status on a non-2xx response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]), { status: 502 });
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/status 502/);
  });
});

describe("HttpClient: network failures", () => {
  it("names no URL or API key when fetch rejects before a response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      throw new TypeError(
        "error sending request for url (https://api.example.org/x?api_key=SECRET)",
      );
    });
    const error = await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "apiKeyQuery", paramName: "api_key", apiKey: "SECRET" },
    })
      .get("/x")
      .catch((caught: unknown) => {
        return caught;
      });
    expect((error as Error).message).not.toMatch(/SECRET|api\.example\.org/);
  });

  it("rethrows an abort unchanged", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    const fetchImpl: FetchLike = vi.fn(async () => {
      throw abortError;
    });
    await expect(
      _createClient(fetchImpl).get(`${BASE_URL}/x`),
    ).rejects.toBe(abortError);
  });
});

describe("HttpClient: state changes", () => {
  it("a client derived with setBaseUrl sends relative URLs to the new base", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL })
      .setBaseUrl("https://next.example.org")
      .get("/x");
    expect(_requestedUrl(fetchImpl)).toBe("https://next.example.org/x");
  });
});
