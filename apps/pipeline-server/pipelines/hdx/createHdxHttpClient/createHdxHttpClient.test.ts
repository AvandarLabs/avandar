import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

const HDX_BASE_URL = "https://data.humdata.org";
const MEBIBYTE = 1024 * 1024;

function _sentHeaders(fetchImpl: FetchLike): Headers {
  return new Headers(vi.mocked(fetchImpl).mock.calls[0]?.[1]?.headers);
}

describe("createHdxHttpClient", () => {
  it("sends no Authorization header", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}");
    });
    await createHdxHttpClient({
      baseUrl: HDX_BASE_URL,
      fetchImpl,
    }).get(`${HDX_BASE_URL}/api/3/action/package_list`);
    expect(_sentHeaders(fetchImpl).has("authorization")).toBe(false);
  });

  it("retries a 429 from HDX", async () => {
    let calls = 0;
    const fetchImpl: FetchLike = vi.fn(async () => {
      calls += 1;
      return new Response("{}", { status: calls === 1 ? 429 : 200 });
    });

    await createHdxHttpClient({
      baseUrl: HDX_BASE_URL,
      fetchImpl,
      sleep: async () => {},
    }).get(`${HDX_BASE_URL}/api/3/action/package_search`);

    expect(vi.mocked(fetchImpl).mock.calls.length).toBe(2);
  });

  it("accepts a response up to 128 MB, since 100-row HDX pages reach 63 MB", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}", {
        headers: { "content-length": String(100 * MEBIBYTE) },
      });
    });

    await expect(
      createHdxHttpClient({ baseUrl: HDX_BASE_URL, fetchImpl }).get(
        `${HDX_BASE_URL}/api/3/action/package_search`,
      ),
    ).resolves.toEqual({});
  });

  it("rejects a response declared above 128 MB", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}", {
        headers: { "content-length": String(128 * MEBIBYTE + 1) },
      });
    });

    await expect(
      createHdxHttpClient({ baseUrl: HDX_BASE_URL, fetchImpl }).get(
        `${HDX_BASE_URL}/api/3/action/package_search`,
      ),
    ).rejects.toThrow(/byte limit/);
  });
});
