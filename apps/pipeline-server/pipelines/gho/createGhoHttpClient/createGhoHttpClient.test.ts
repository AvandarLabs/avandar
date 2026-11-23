import { createGhoHttpClient } from "@pipelines/gho/createGhoHttpClient/createGhoHttpClient";
import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

const GHO_BASE_URL = "https://ghoapi.azureedge.net/api";
const MEBIBYTE = 1024 * 1024;

describe("createGhoHttpClient", () => {
  it("sends no Authorization header", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}");
    });

    await createGhoHttpClient({ baseUrl: GHO_BASE_URL, fetchImpl }).get(
      `${GHO_BASE_URL}/Indicator`,
    );

    const headers = new Headers(
      vi.mocked(fetchImpl).mock.calls[0]?.[1]?.headers,
    );
    expect(headers.has("authorization")).toBe(false);
  });

  it("lets eight requests run at once, and holds a ninth until one answers", async () => {
    let numInFlight = 0;
    const releases: Array<() => void> = [];
    const fetchImpl: FetchLike = vi.fn(async () => {
      numInFlight += 1;
      await new Promise<void>((resolve) => {
        releases.push(resolve);
      });
      numInFlight -= 1;
      return new Response("{}");
    });
    const http = createGhoHttpClient({ baseUrl: GHO_BASE_URL, fetchImpl });

    const requests = Array.from({ length: 9 }, (_unused, index) => {
      return http.get(`${GHO_BASE_URL}/I${index}`);
    });
    await vi.waitFor(
      () => {
        expect(numInFlight).toBe(8);
      },
      { timeout: 3000 },
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(numInFlight).toBe(8);
    releases.forEach((release) => {
      release();
    });
    await vi.waitFor(() => {
      expect(releases).toHaveLength(9);
    });
    releases.at(-1)?.();
    await Promise.all(requests);
  });

  it("retries a 429 from GHO", async () => {
    let calls = 0;
    const fetchImpl: FetchLike = vi.fn(async () => {
      calls += 1;
      return new Response("{}", { status: calls === 1 ? 429 : 200 });
    });

    await createGhoHttpClient({
      baseUrl: GHO_BASE_URL,
      fetchImpl,
      sleep: async () => {},
    }).get(`${GHO_BASE_URL}/Indicator`);

    expect(vi.mocked(fetchImpl).mock.calls.length).toBe(2);
  });

  it("reads the 12 MB $metadata document", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("<edmx:Edmx />", {
        headers: { "content-length": String(13 * MEBIBYTE) },
      });
    });

    await expect(
      createGhoHttpClient({ baseUrl: GHO_BASE_URL, fetchImpl }).getBytes(
        `${GHO_BASE_URL}/$metadata`,
      ),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it("rejects a response declared above 32 MB", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}", {
        headers: { "content-length": String(32 * MEBIBYTE + 1) },
      });
    });

    await expect(
      createGhoHttpClient({ baseUrl: GHO_BASE_URL, fetchImpl }).get(
        `${GHO_BASE_URL}/Indicator`,
      ),
    ).rejects.toThrow(/byte limit/);
  });
});
