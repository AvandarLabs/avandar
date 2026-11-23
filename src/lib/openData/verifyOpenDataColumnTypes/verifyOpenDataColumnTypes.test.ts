import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpenDataColumnTypeSampleCache } from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
import {
  isColumnTypeVerificationDue,
  verifyOpenDataColumnTypes,
} from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const LISTING_ID =
  "55555555-5555-4555-8555-555555555555" as DataCatalogListing.Id;
const EDGE_FUNCTIONS_URL = "https://functions.example";

const { getSessionMock } = vi.hoisted(() => {
  return { getSessionMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { auth: { getSession: getSessionMock } };
      },
      getEdgeFunctionsURL: () => {
        return "https://functions.example";
      },
    },
  };
});

function _listing(
  overrides: Partial<DataCatalogListing.T> = {},
): Pick<
  DataCatalogListing.T,
  | "accessKind"
  | "apiResourceFormat"
  | "dateColumnTypeLastVerified"
  | "dateOfLastUpdate"
  | "isInvalid"
  | "isWorkspaceLoadable"
> {
  return {
    accessKind: "api_resource",
    apiResourceFormat: "CSV",
    dateColumnTypeLastVerified: undefined,
    isInvalid: false,
    isWorkspaceLoadable: true,
    dateOfLastUpdate: "2026-10-20T00:00:00+00:00",
    ...overrides,
  };
}

describe("isColumnTypeVerificationDue", () => {
  it.each([
    ["never verified", {}, true],
    [
      "verified before the source last changed",
      { dateColumnTypeLastVerified: "2026-10-19T00:00:00+00:00" },
      true,
    ],
    [
      "verified since the source last changed",
      { dateColumnTypeLastVerified: "2026-10-21T00:00:00+00:00" },
      false,
    ],
    [
      "verified, with no source change date",
      {
        dateColumnTypeLastVerified: "2026-10-21T00:00:00+00:00",
        dateOfLastUpdate: undefined,
      },
      false,
    ],
    ["a Parquet resource", { apiResourceFormat: "PARQUET" }, false],
    ["marked invalid", { isInvalid: true }, false],
    ["not supported in a workspace", { isWorkspaceLoadable: false }, false],
    [
      "a pipeline Parquet listing",
      { accessKind: "pipeline_parquet", apiResourceFormat: undefined },
      false,
    ],
  ] as const)("is %s: %s", (_label, overrides, expected) => {
    expect(isColumnTypeVerificationDue(_listing(overrides))).toBe(expected);
  });
});

describe("verifyOpenDataColumnTypes", () => {
  beforeEach(() => {
    clearOpenDataColumnTypeSampleCache();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("infers types from the sample and sends them back with the sample's token", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response("borough,count\nBronx,3\n", {
          status: 200,
          headers: { "X-Ava-Column-Type-Token": "token-1" },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const inferColumnTypes = vi.fn(async () => {
      return [
        { name: "borough", dataType: "VARCHAR" },
        { name: "count", dataType: "BIGINT" },
      ] as const;
    });

    await verifyOpenDataColumnTypes(LISTING_ID, { inferColumnTypes });

    expect(inferColumnTypes).toHaveBeenCalledWith("borough,count\nBronx,3\n");
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${EDGE_FUNCTIONS_URL}/open-data/data-catalog-listings/${LISTING_ID}/column-type-sample`,
      { headers: { Authorization: "Bearer session-token" } },
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${EDGE_FUNCTIONS_URL}/open-data/data-catalog-listings/${LISTING_ID}/column-types`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "token-1",
          columns: [
            { name: "borough", dataType: "VARCHAR" },
            { name: "count", dataType: "BIGINT" },
          ],
        }),
      },
    );
  });

  function _mockSampleAndWriteBack(isComplete: boolean): void {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response("borocode\n1\n", {
          status: 200,
          headers: {
            "X-Ava-Column-Type-Token": "token-1",
            "X-Ava-Column-Type-Sample-Complete": String(isComplete),
          },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  }

  const inferBorocode = async () => {
    return [{ name: "borocode", dataType: "BIGINT" }] as const;
  };

  it("builds the copy from a sample that held the whole source, once its types are written", async () => {
    _mockSampleAndWriteBack(true);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "building" }), { status: 202 }),
    );

    await verifyOpenDataColumnTypes(LISTING_ID, {
      inferColumnTypes: inferBorocode,
    });

    const [url, init] = vi.mocked(fetch).mock.calls[2] as [string, RequestInit];
    expect(url).toBe(
      `${EDGE_FUNCTIONS_URL}/open-data/data-catalog-listings/${LISTING_ID}/parquet-cache`,
    );
    expect(JSON.parse(String(init.body))).toEqual({
      completeSample: { csvText: "borocode\n1\n", token: "token-1" },
    });
  });

  it("asks for no copy from a sample that is only the start of the source", async () => {
    _mockSampleAndWriteBack(false);

    await verifyOpenDataColumnTypes(LISTING_ID, {
      inferColumnTypes: inferBorocode,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("still verifies the types when the copy cannot be requested", async () => {
    _mockSampleAndWriteBack(true);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));

    await expect(
      verifyOpenDataColumnTypes(LISTING_ID, {
        inferColumnTypes: inferBorocode,
      }),
    ).resolves.toBeUndefined();
  });

  it("fails when the sample cannot be read, without inferring anything", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 422 }));
    const inferColumnTypes = vi.fn();

    await expect(
      verifyOpenDataColumnTypes(LISTING_ID, { inferColumnTypes }),
    ).rejects.toThrow("Column type sample fetch failed: 422");
    expect(inferColumnTypes).not.toHaveBeenCalled();
  });

  it("fails when the write-back is refused", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response("a\n1\n", {
          status: 200,
          headers: { "X-Ava-Column-Type-Token": "token-1" },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 409 }));

    await expect(
      verifyOpenDataColumnTypes(LISTING_ID, {
        inferColumnTypes: async () => {
          return [{ name: "a", dataType: "BIGINT" }];
        },
      }),
    ).rejects.toThrow("Column type write-back failed: 409");
  });

  it.each([
    [
      "DuckDB cannot parse the sample",
      async () => {
        throw new Error("Invalid unicode");
      },
    ],
    [
      "DuckDB finds no columns",
      async () => {
        return [];
      },
    ],
  ])(
    "reports the sample as unparseable when %s",
    async (_label, inferColumnTypes) => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response("\u0000\u0001", {
            status: 200,
            headers: { "X-Ava-Column-Type-Token": "token-1" },
          }),
        )
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await expect(
        verifyOpenDataColumnTypes(LISTING_ID, { inferColumnTypes }),
      ).rejects.toThrow("could not be parsed");
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        `${EDGE_FUNCTIONS_URL}/open-data/data-catalog-listings/${LISTING_ID}/unparseable`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer session-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: "token-1" }),
        },
      );
    },
  );

  it("names why the sample could not be read when the server says", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "resource-empty",
            invalidDatasetReason: "empty_dataset",
          },
        }),
        { status: 409 },
      ),
    );

    await expect(
      verifyOpenDataColumnTypes(LISTING_ID, { inferColumnTypes: vi.fn() }),
    ).rejects.toThrow("Column type sample fetch failed: 409 (resource-empty)");
  });
});
