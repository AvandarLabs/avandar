/** Tests the open-data edge-function proxy the browser uses for CKAN bytes. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOpenDataCatalogResource } from "@/lib/openData/fetchOpenDataCatalogResource";
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry";

const CATALOG_ENTRY_ID =
  "55555555-5555-4555-8555-555555555555" as OpenDataCatalogEntry.Id;
const EDGE_FUNCTIONS_URL = "https://functions.example";
const ACCESS_TOKEN = "session-token";

const { getSessionMock, getEdgeFunctionsURLMock } = vi.hoisted(() => {
  return {
    getSessionMock: vi.fn(),
    getEdgeFunctionsURLMock: vi.fn(() => {
      return "https://functions.example";
    }),
  };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { auth: { getSession: getSessionMock } };
      },
      getEdgeFunctionsURL: getEdgeFunctionsURLMock,
    },
  };
});

function _session(accessToken: string | undefined) {
  return {
    data: {
      session:
        accessToken === undefined ? null : { access_token: accessToken },
    },
  };
}

describe("fetchOpenDataCatalogResource", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(_session(ACCESS_TOKEN));
    getEdgeFunctionsURLMock.mockReturnValue(EDGE_FUNCTIONS_URL);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses to fetch when no session token is available", async () => {
    getSessionMock.mockResolvedValue(_session(undefined));

    await expect(
      fetchOpenDataCatalogResource(CATALOG_ENTRY_ID),
    ).rejects.toThrow("No session is available to fetch open data");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns parquet bytes, content kind, and source version from the proxy", async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: {
          "X-Ava-Content-Kind": "parquet",
          "X-Ava-Source-Version": "ckan:hash:abc",
        },
      }),
    );

    const fetched = await fetchOpenDataCatalogResource(CATALOG_ENTRY_ID);

    expect(fetch).toHaveBeenCalledWith(
      `${EDGE_FUNCTIONS_URL}/open-data/catalog-entries/${CATALOG_ENTRY_ID}/resource`,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
    );
    expect(fetched.contentKind).toBe("parquet");
    expect(fetched.sourceVersion).toBe("ckan:hash:abc");
    expect(fetched.bytes).toEqual(bytes);
  });

  it("reports a failed proxy response without reading a content kind", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 502 }));

    await expect(
      fetchOpenDataCatalogResource(CATALOG_ENTRY_ID),
    ).rejects.toThrow("Open data resource fetch failed: 502");
  });

  it("refuses a successful response that omits a content kind", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(Uint8Array.from([1]), { status: 200 }),
    );

    await expect(
      fetchOpenDataCatalogResource(CATALOG_ENTRY_ID),
    ).rejects.toThrow("Open data resource response omitted a content kind");
  });
});
