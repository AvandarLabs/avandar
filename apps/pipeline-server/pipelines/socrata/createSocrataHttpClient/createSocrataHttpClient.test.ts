import { createSocrataHttpClient } from "@pipelines/socrata/createSocrataHttpClient/createSocrataHttpClient";
import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

const DISCOVERY_URL = "https://api.us.socrata.com/api/catalog/v1?domains=x";

function _sentHeaders(fetchImpl: FetchLike): Headers {
  return new Headers(vi.mocked(fetchImpl).mock.calls[0]?.[1]?.headers);
}

describe("createSocrataHttpClient", () => {
  it("sends the app token to the Discovery API", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}");
    });
    await createSocrataHttpClient({ appToken: "token", fetchImpl }).get(
      DISCOVERY_URL,
    );
    expect(_sentHeaders(fetchImpl).get("x-app-token")).toBe("token");
  });

  it("sends no app token when none is configured", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("{}");
    });
    await createSocrataHttpClient({ appToken: undefined, fetchImpl }).get(
      DISCOVERY_URL,
    );
    expect(_sentHeaders(fetchImpl).has("x-app-token")).toBe(false);
  });
});
