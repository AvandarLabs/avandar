/** Tests waiting for, and downloading, an ODC listing's Parquet copy. */

import { describe, expect, it, vi } from "vitest";
import {
  createOpenDataParquetCopyFetcher,
  OpenDataParquetCopyError,
} from "@/lib/openData/fetchOpenDataParquetCopy/fetchOpenDataParquetCopy";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { OpenDataParquetCopyAnswer } from "@/lib/openData/requestOpenDataParquetCopy/requestOpenDataParquetCopy";

const CATALOG_LISTING_ID =
  "55555555-5555-4555-8555-555555555555" as DataCatalogListing.Id;

const READY: OpenDataParquetCopyAnswer = {
  status: "ready",
  partPaths: ["folder/part-00000.parquet", "folder/part-00001.parquet"],
  sourceVersion: "socrata:1",
  isStale: false,
};

/**
 * A fake clock whose `wait` advances time instead of sleeping, recording
 * every wait it was asked for.
 */
function _createFakeClock(): {
  now: () => number;
  wait: (ms: number) => Promise<void>;
  waits: number[];
} {
  let currentMs = 0;
  const waits: number[] = [];
  return {
    now: () => {
      return currentMs;
    },
    wait: async (ms) => {
      waits.push(ms);
      currentMs += ms;
    },
    waits,
  };
}

function _createFetcher(
  answers: readonly OpenDataParquetCopyAnswer[],
  options: { maxWaitMs?: number } = {},
) {
  const clock = _createFakeClock();
  const requestCopy = vi.fn<() => Promise<OpenDataParquetCopyAnswer>>();
  answers.forEach((answer) => {
    requestCopy.mockResolvedValueOnce(answer);
  });
  const blobByPath = new Map<string, Blob>();
  const downloadPart = vi.fn(async (path: string) => {
    const blob = new Blob([path]);
    blobByPath.set(path, blob);
    return blob;
  });
  const fetchCopy = createOpenDataParquetCopyFetcher({
    requestCopy,
    downloadPart,
    now: clock.now,
    wait: clock.wait,
    maxWaitMs: options.maxWaitMs ?? 60_000,
  });
  return { blobByPath, clock, downloadPart, fetchCopy, requestCopy };
}

describe("createOpenDataParquetCopyFetcher", () => {
  it("downloads a ready copy's parts in row order", async () => {
    const { blobByPath, fetchCopy, requestCopy } = _createFetcher([READY]);

    const copy = await fetchCopy(CATALOG_LISTING_ID);

    expect(requestCopy).toHaveBeenCalledWith(CATALOG_LISTING_ID);
    expect(copy?.partBlobs).toEqual([
      blobByPath.get("folder/part-00000.parquet"),
      blobByPath.get("folder/part-00001.parquet"),
    ]);
    expect(copy?.partBlobs[0]).toBe(
      blobByPath.get("folder/part-00000.parquet"),
    );
    expect(copy?.partBlobs[1]).toBe(
      blobByPath.get("folder/part-00001.parquet"),
    );
    expect(copy?.sourceVersion).toBe("socrata:1");
    expect(copy?.isStale).toBe(false);
  });

  it("asks again, waiting longer each time, until a building copy is ready", async () => {
    const { clock, fetchCopy, requestCopy } = _createFetcher([
      { status: "building" },
      { status: "building" },
      { status: "building" },
      READY,
    ]);

    const copy = await fetchCopy(CATALOG_LISTING_ID);

    expect(requestCopy).toHaveBeenCalledTimes(4);
    expect(copy?.partBlobs).toHaveLength(2);
    expect(clock.waits).toHaveLength(3);
    expect(clock.waits[1]).toBeGreaterThan(clock.waits[0] ?? 0);
    expect(clock.waits[2]).toBeGreaterThan(clock.waits[1] ?? 0);
  });

  it("never waits longer than 15 seconds between requests", async () => {
    const { clock, fetchCopy } = _createFetcher(
      [
        ...Array.from({ length: 30 }, () => {
          return { status: "building" as const };
        }),
        READY,
      ],
      { maxWaitMs: 60 * 60_000 },
    );

    await fetchCopy(CATALOG_LISTING_ID);

    expect(Math.max(...clock.waits)).toBe(15_000);
  });

  it("stops waiting once a build runs past the wait limit", async () => {
    const { fetchCopy } = _createFetcher(
      Array.from({ length: 100 }, () => {
        return { status: "building" as const };
      }),
      { maxWaitMs: 30_000 },
    );

    const error = await fetchCopy(CATALOG_LISTING_ID).catch(
      (caught: unknown) => {
        return caught;
      },
    );

    expect(error).toBeInstanceOf(OpenDataParquetCopyError);
    expect((error as OpenDataParquetCopyError).reason).toBe("still-preparing");
  });

  it("throws a failed build's failure code", async () => {
    const { downloadPart, fetchCopy } = _createFetcher([
      { status: "failed", failureCode: "source-empty" },
    ]);

    const error = await fetchCopy(CATALOG_LISTING_ID).catch(
      (caught: unknown) => {
        return caught;
      },
    );

    expect(error).toBeInstanceOf(OpenDataParquetCopyError);
    expect((error as OpenDataParquetCopyError).reason).toBe("failed");
    expect((error as OpenDataParquetCopyError).failureCode).toBe(
      "source-empty",
    );
    expect(downloadPart).not.toHaveBeenCalled();
  });

  it("throws when this Avandar instance builds no copies", async () => {
    const { downloadPart, fetchCopy } = _createFetcher([
      { status: "unavailable", reason: "copies-unavailable" },
    ]);

    const error = await fetchCopy(CATALOG_LISTING_ID).catch(
      (caught: unknown) => {
        return caught;
      },
    );

    expect(error).toBeInstanceOf(OpenDataParquetCopyError);
    expect((error as OpenDataParquetCopyError).reason).toBe("unavailable");
    expect(downloadPart).not.toHaveBeenCalled();
  });

  it("reports a stale copy as stale", async () => {
    const { fetchCopy } = _createFetcher([{ ...READY, isStale: true }]);

    await expect(fetchCopy(CATALOG_LISTING_ID)).resolves.toMatchObject({
      isStale: true,
    });
  });
});
