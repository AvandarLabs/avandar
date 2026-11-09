import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseParquetCopyStore } from "@pipeline-server/openDataParquetCache/createSupabaseParquetCopyStore/createSupabaseParquetCopyStore";

const { uploadMock, listingRowMock } = vi.hoisted(() => {
  return { uploadMock: vi.fn(), listingRowMock: vi.fn() };
});

/** A query whose `eq` answers both as a list and as `maybeSingle`. */
function _createQuery(table: string) {
  const answer = () => {
    return table === "data_catalog_listings"
      ? { data: listingRowMock(), error: null }
      : { data: [{ column_name: "IndicatorCode" }], error: null };
  };
  return {
    select: () => {
      return {
        eq: () => {
          return {
            maybeSingle: async () => {
              return answer();
            },
            then: (resolve: (value: unknown) => void) => {
              resolve(answer());
            },
          };
        },
      };
    },
  };
}

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => {
      return {
        from: _createQuery,
        storage: {
          from: () => {
            return { upload: uploadMock };
          },
        },
      };
    },
  };
});

describe("createSupabaseParquetCopyStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "parquet-copy-store-"));
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({ error: null });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uploads a part as Parquet that browsers may cache for a year", async () => {
    const partPath = join(tempDir, "part-00000.parquet");
    await writeFile(partPath, "parquet bytes");
    const store = createSupabaseParquetCopyStore({
      url: "http://localhost:54321",
      serviceRoleKey: "service-role-key",
    });

    await store.uploadPart({
      objectPath: "catalog-cache/listing/build/part-00000.parquet",
      partPath,
    });

    expect(uploadMock).toHaveBeenCalledWith(
      "catalog-cache/listing/build/part-00000.parquet",
      expect.anything(),
      {
        contentType: "application/vnd.apache.parquet",
        cacheControl: "31536000",
        upsert: true,
      },
    );
  });

  it("reads the listing's freshness probe, so a build records the token the edge function compares", async () => {
    const probe = {
      url: "https://ghoapi.azureedge.net/api/WHS3_62?$top=1",
      token: { kind: "json-paths", paths: [["value", 0, "Date"]] },
    };
    listingRowMock.mockReturnValue({
      id: "listing-1",
      access_kind: "api_resource",
      pipeline_name: "gho",
      parquet_cache_build_id: "build-1",
      api_base_url: "https://ghoapi.azureedge.net/api",
      api_resource_id: "WHS3_62",
      external_dataset_id: "WHS3_62",
      api_resource_format: "ODATA",
      api_freshness_probe: probe,
    });
    const store = createSupabaseParquetCopyStore({
      url: "http://localhost:54321",
      serviceRoleKey: "service-role-key",
    });

    const listing = await store.readListing("listing-1");

    expect(listing?.freshnessProbe).toEqual(probe);
  });

  it("reads a listing with no freshness probe as having none", async () => {
    listingRowMock.mockReturnValue({
      id: "listing-2",
      access_kind: "api_resource",
      pipeline_name: "socrata",
      parquet_cache_build_id: "build-2",
      api_base_url: "https://data.cityofnewyork.us",
      api_resource_id: "abcd-1234",
      external_dataset_id: "abcd-1234",
      api_resource_format: "CSV",
      api_freshness_probe: null,
    });
    const store = createSupabaseParquetCopyStore({
      url: "http://localhost:54321",
      serviceRoleKey: "service-role-key",
    });

    const listing = await store.readListing("listing-2");

    expect(listing).toBeDefined();
    expect(listing?.freshnessProbe).toBeUndefined();
  });
});
