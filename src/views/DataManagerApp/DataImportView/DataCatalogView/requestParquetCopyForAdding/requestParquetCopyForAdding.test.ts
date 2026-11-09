/** Tests requesting a listing's Parquet copy as it is added to a workspace. */

import { describe, expect, it, vi } from "vitest";
import { requestParquetCopyForAdding } from "@/views/DataManagerApp/DataImportView/DataCatalogView/requestParquetCopyForAdding/requestParquetCopyForAdding";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const LISTING_ID =
  "55555555-5555-4555-8555-555555555555" as DataCatalogListing.Id;

describe("requestParquetCopyForAdding", () => {
  it("says the data is being prepared while a build runs", async () => {
    const requestCopy = vi.fn().mockResolvedValue({ status: "building" });

    await expect(
      requestParquetCopyForAdding({
        listing: { id: LISTING_ID, accessKind: "api_resource" },
        requestCopy,
      }),
    ).resolves.toBe("preparing");
    expect(requestCopy).toHaveBeenCalledWith(LISTING_ID);
  });

  it("hands back a complete sample this page already read, so the source is not read again", async () => {
    const requestCopy = vi.fn().mockResolvedValue({ status: "building" });
    const completeSample = { csvText: "borocode\n1\n", token: "token-1" };

    await requestParquetCopyForAdding({
      listing: { id: LISTING_ID, accessKind: "api_resource" },
      requestCopy,
      readCompleteSample: (catalogListingId) => {
        return catalogListingId === LISTING_ID ? completeSample : undefined;
      },
    });

    expect(requestCopy).toHaveBeenCalledWith(LISTING_ID, { completeSample });
  });

  it("says the data could not be prepared when the build failed", async () => {
    const requestCopy = vi
      .fn()
      .mockResolvedValue({ status: "failed", failureCode: "source-empty" });

    await expect(
      requestParquetCopyForAdding({
        listing: { id: LISTING_ID, accessKind: "api_resource" },
        requestCopy,
      }),
    ).resolves.toBe("failed");
  });

  it("says nothing when the copy is ready or copies are unavailable", async () => {
    const requestCopy = vi
      .fn()
      .mockResolvedValueOnce({
        status: "ready",
        partPaths: ["p0"],
        sourceVersion: undefined,
        isStale: false,
      })
      .mockResolvedValueOnce({
        status: "unavailable",
        reason: "copies-unavailable",
      });
    const listing = { id: LISTING_ID, accessKind: "api_resource" } as const;

    await expect(
      requestParquetCopyForAdding({ listing, requestCopy }),
    ).resolves.toBeUndefined();
    await expect(
      requestParquetCopyForAdding({ listing, requestCopy }),
    ).resolves.toBeUndefined();
  });

  it("never requests a copy of a listing the pipelines already store as Parquet", async () => {
    const requestCopy = vi.fn();

    await expect(
      requestParquetCopyForAdding({
        listing: { id: LISTING_ID, accessKind: "pipeline_parquet" },
        requestCopy,
      }),
    ).resolves.toBeUndefined();
    expect(requestCopy).not.toHaveBeenCalled();
  });
});
