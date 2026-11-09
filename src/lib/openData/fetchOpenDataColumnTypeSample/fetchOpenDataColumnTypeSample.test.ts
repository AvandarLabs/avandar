import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOpenDataColumnTypeSampleCache,
  fetchOpenDataColumnTypeSample,
} from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const LISTING_ID =
  "66666666-6666-4666-8666-666666666666" as DataCatalogListing.Id;
const OTHER_LISTING_ID =
  "77777777-7777-4777-8777-777777777777" as DataCatalogListing.Id;
const SAMPLE_URL =
  "https://functions.example/open-data/data-catalog-listings/" +
  `${LISTING_ID}/column-type-sample`;

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      getEdgeFunctionsURL: () => {
        return "https://functions.example";
      },
    },
  };
});

function _sampleResponse(csvText: string, token: string): Response {
  return new Response(csvText, {
    status: 200,
    headers: { "X-Ava-Column-Type-Token": token },
  });
}

function _rejectedResponse(status: number, code?: string): Response {
  return new Response(
    JSON.stringify({ error: code === undefined ? {} : { code } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

describe("fetchOpenDataColumnTypeSample", () => {
  const sleep = vi.fn(() => {
    return Promise.resolve();
  });

  beforeEach(() => {
    clearOpenDataColumnTypeSampleCache();
    sleep.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the sample after a gateway rejection is followed by a successful read", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(_rejectedResponse(502, "socrata-unreachable"))
      .mockResolvedValueOnce(_sampleResponse("borough,count\n", "token-1"));

    const sample = await fetchOpenDataColumnTypeSample(LISTING_ID, {
      accessToken: "session-token",
      sleep,
    });

    expect(sample).toEqual({ csvText: "borough,count\n", token: "token-1" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, SAMPLE_URL, {
      headers: { Authorization: "Bearer session-token" },
    });
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("does not retry a sample the server refused", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      _rejectedResponse(409, "resource-empty"),
    );

    await expect(
      fetchOpenDataColumnTypeSample(LISTING_ID, {
        accessToken: "session-token",
        sleep,
      }),
    ).rejects.toThrow("Column type sample fetch failed: 409 (resource-empty)");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("throws after three gateway rejections", async () => {
    vi.mocked(fetch).mockImplementation(() => {
      return Promise.resolve(_rejectedResponse(503, "socrata-unreachable"));
    });

    await expect(
      fetchOpenDataColumnTypeSample(LISTING_ID, {
        accessToken: "session-token",
        sleep,
      }),
    ).rejects.toThrow(
      "Column type sample fetch failed: 503 (socrata-unreachable)",
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("uses one read for two overlapping requests for the same listing", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });

    const first = fetchOpenDataColumnTypeSample(LISTING_ID, {
      accessToken: "session-token",
      sleep,
    });
    const second = fetchOpenDataColumnTypeSample(LISTING_ID, {
      accessToken: "session-token",
      sleep,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    resolveFetch?.(_sampleResponse("a\n1\n", "token-shared"));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { csvText: "a\n1\n", token: "token-shared" },
      { csvText: "a\n1\n", token: "token-shared" },
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reuses a sample it already read for the same listing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      _sampleResponse("a\n1\n", "token-kept"),
    );

    const first = await fetchOpenDataColumnTypeSample(LISTING_ID, {
      accessToken: "session-token",
      sleep,
    });
    const second = await fetchOpenDataColumnTypeSample(LISTING_ID, {
      accessToken: "session-token",
      sleep,
    });

    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reads again after the server refuses the sample", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(_rejectedResponse(409, "resource-empty"))
      .mockResolvedValueOnce(_sampleResponse("a\n1\n", "token-2"));

    await expect(
      fetchOpenDataColumnTypeSample(LISTING_ID, {
        accessToken: "session-token",
        sleep,
      }),
    ).rejects.toThrow("Column type sample fetch failed: 409 (resource-empty)");

    const sample = await fetchOpenDataColumnTypeSample(LISTING_ID, {
      accessToken: "session-token",
      sleep,
    });

    expect(sample).toEqual({ csvText: "a\n1\n", token: "token-2" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reads each listing on its own", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(_sampleResponse("a\n1\n", "token-a"))
      .mockResolvedValueOnce(_sampleResponse("b\n2\n", "token-b"));

    const [first, second] = await Promise.all([
      fetchOpenDataColumnTypeSample(LISTING_ID, {
        accessToken: "session-token",
        sleep,
      }),
      fetchOpenDataColumnTypeSample(OTHER_LISTING_ID, {
        accessToken: "session-token",
        sleep,
      }),
    ]);

    expect(first).toEqual({ csvText: "a\n1\n", token: "token-a" });
    expect(second).toEqual({ csvText: "b\n2\n", token: "token-b" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
