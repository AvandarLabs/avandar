import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

const HDX_BASE_URL = "https://data.humdata.org";

function _sentHeaders(fetchImpl: FetchLike): Headers {
  return new Headers(vi.mocked(fetchImpl).mock.calls[0]?.[1]?.headers);
}

describe("createHdxHttpClient", () => {
  it("sends the API token in the Authorization header, as HDX expects", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}");
    });
    await createHdxHttpClient({
      baseUrl: HDX_BASE_URL,
      apiKey: "token",
      fetchImpl,
    }).get(`${HDX_BASE_URL}/api/3/action/package_list`);
    expect(_sentHeaders(fetchImpl).get("authorization")).toBe("token");
  });

  it("sends no Authorization header when no API token is configured", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}");
    });
    await createHdxHttpClient({
      baseUrl: HDX_BASE_URL,
      apiKey: undefined,
      fetchImpl,
    }).get(`${HDX_BASE_URL}/api/3/action/package_list`);
    expect(_sentHeaders(fetchImpl).has("authorization")).toBe(false);
  });
});
