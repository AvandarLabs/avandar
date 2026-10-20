import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

const HDX_BASE_URL = "https://data.humdata.org";

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
});
