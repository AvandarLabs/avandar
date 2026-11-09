/** Tests reading the open-data edge function's Parquet copy answers. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestOpenDataParquetCopy } from "@/lib/openData/requestOpenDataParquetCopy/requestOpenDataParquetCopy";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const CATALOG_LISTING_ID =
  "55555555-5555-4555-8555-555555555555" as DataCatalogListing.Id;
const ACCESS_TOKEN = "session-token";

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      getEdgeFunctionsURL: () => {
        return "https://functions.example";
      },
    },
  };
});

function _jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestOpenDataParquetCopy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts an empty body with the caller's token to the listing's route", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(202, { status: "building" }),
    );

    await requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
      accessToken: ACCESS_TOKEN,
    });

    expect(fetch).toHaveBeenCalledWith(
      `https://functions.example/open-data/data-catalog-listings/${CATALOG_LISTING_ID}/parquet-cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
  });

  it("hands back a complete sample to build the copy from", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(202, { status: "building" }),
    );

    await requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
      accessToken: ACCESS_TOKEN,
      completeSample: { csvText: "borocode\n1\n", token: "sample-token" },
    });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      completeSample: { csvText: "borocode\n1\n", token: "sample-token" },
    });
  });

  it("returns a ready copy's parts and whether it is stale", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(200, {
        status: "ready",
        partPaths: ["catalog-cache/a/b/part-00000.parquet"],
        rowCount: 10,
        byteSize: 2048,
        sourceVersion: "socrata:1",
        isStale: true,
      }),
    );

    await expect(
      requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
        accessToken: ACCESS_TOKEN,
      }),
    ).resolves.toEqual({
      status: "ready",
      partPaths: ["catalog-cache/a/b/part-00000.parquet"],
      sourceVersion: "socrata:1",
      isStale: true,
    });
  });

  it("returns a ready copy with no source version as undefined", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(200, {
        status: "ready",
        partPaths: ["p0", "p1"],
        isStale: false,
      }),
    );

    await expect(
      requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
        accessToken: ACCESS_TOKEN,
      }),
    ).resolves.toEqual({
      status: "ready",
      partPaths: ["p0", "p1"],
      sourceVersion: undefined,
      isStale: false,
    });
  });

  it("returns a failed build's failure code", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(409, { status: "failed", failureCode: "source-empty" }),
    );

    await expect(
      requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
        accessToken: ACCESS_TOKEN,
      }),
    ).resolves.toEqual({ status: "failed", failureCode: "source-empty" });
  });

  it("returns that copies are unavailable when no server builds them", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(503, {
        status: "unavailable",
        reason: "copies-unavailable",
      }),
    );

    await expect(
      requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
        accessToken: ACCESS_TOKEN,
      }),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "copies-unavailable",
    });
  });

  it("throws, naming the status, when the route answers anything else", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(404, { error: { code: "not-found" } }),
    );

    await expect(
      requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
        accessToken: ACCESS_TOKEN,
      }),
    ).rejects.toThrow("Open data Parquet copy request failed: 404");
  });

  it("throws when a known status carries a body it cannot read", async () => {
    vi.mocked(fetch).mockResolvedValue(
      _jsonResponse(503, { message: "Service Unavailable" }),
    );

    await expect(
      requestOpenDataParquetCopy(CATALOG_LISTING_ID, {
        accessToken: ACCESS_TOKEN,
      }),
    ).rejects.toThrow("Open data Parquet copy request failed: 503");
  });
});
