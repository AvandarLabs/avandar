import { MIMEType, promiseMap } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { requestOpenDataParquetCopy } from "@/lib/openData/requestOpenDataParquetCopy/requestOpenDataParquetCopy";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { OpenDataParquetCopyAnswer } from "@/lib/openData/requestOpenDataParquetCopy/requestOpenDataParquetCopy";

/** The public bucket that holds ODC listings' Parquet copies. */
const OPEN_DATA_BUCKET = "opendata";

/** How long to wait before asking again whether a building copy is ready. */
const FIRST_POLL_DELAY_MS = 2_000;
const MAX_POLL_DELAY_MS = 15_000;
const POLL_DELAY_GROWTH = 1.5;

/**
 * How long a load waits for a building copy before giving up. A large
 * source can take longer than this, and the build keeps running after the
 * load stops waiting.
 */
const DEFAULT_MAX_WAIT_MS = 10 * 60_000;

/** An ODC listing's Parquet copy, downloaded. */
export type FetchedOpenDataParquetCopy = Readonly<{
  /** The copy's parts, in row order, each typed as Parquet. */
  partBlobs: readonly Blob[];
  sourceVersion: SourceVersion | undefined;
  /** True when the source changed since the copy was built. */
  isStale: boolean;
}>;

/**
 * Why a copy could not be read: its build failed, or it was still being
 * prepared when the load stopped waiting.
 */
export class OpenDataParquetCopyError extends Error {
  readonly reason: "failed" | "still-preparing";
  readonly failureCode: string | undefined;

  constructor(
    options: Readonly<{
      catalogListingId: DataCatalogListing.Id;
      reason: "failed" | "still-preparing";
      failureCode?: string;
    }>,
  ) {
    super(
      options.reason === "failed"
        ? `The Parquet copy of catalog listing '${options.catalogListingId}' failed to build (${options.failureCode})`
        : `The Parquet copy of catalog listing '${options.catalogListingId}' is still being prepared`,
    );
    this.name = "OpenDataParquetCopyError";
    this.reason = options.reason;
    this.failureCode = options.failureCode;
  }
}

type OpenDataParquetCopyFetcherDependencies = Readonly<{
  requestCopy: (
    catalogListingId: DataCatalogListing.Id,
  ) => Promise<OpenDataParquetCopyAnswer>;
  /** Downloads one part from the `opendata` bucket. */
  downloadPart: (partPath: string) => Promise<Blob>;
  now: () => number;
  wait: (ms: number) => Promise<void>;
  maxWaitMs: number;
}>;

/**
 * Downloads one part of a copy through the bucket's public URL, the way a
 * pipeline listing's Parquet is read.
 */
async function _downloadPublicPart(partPath: string): Promise<Blob> {
  const { publicUrl } = AvaSupabase.db()
    .storage.from(OPEN_DATA_BUCKET)
    .getPublicUrl(partPath).data;
  const response = await fetch(publicUrl);
  if (!response.ok) {
    throw new Error(
      `Open data Parquet copy part download failed: ${response.status}`,
    );
  }
  return new Blob([await response.arrayBuffer()], {
    type: MIMEType.APPLICATION_PARQUET,
  });
}

/**
 * Asks for the copy until it is no longer building, waiting longer between
 * each request, up to `maxWaitMs` in all.
 */
async function _requestUntilBuilt(
  catalogListingId: DataCatalogListing.Id,
  deps: OpenDataParquetCopyFetcherDependencies,
): Promise<Exclude<OpenDataParquetCopyAnswer, { status: "building" }>> {
  const startedAtMs = deps.now();
  let delayMs = FIRST_POLL_DELAY_MS;
  for (;;) {
    // Each request depends on the answer before it, so they run in turn.
    const answer = await deps.requestCopy(catalogListingId);
    if (answer.status !== "building") {
      return answer;
    }
    if (deps.now() - startedAtMs + delayMs > deps.maxWaitMs) {
      throw new OpenDataParquetCopyError({
        catalogListingId,
        reason: "still-preparing",
      });
    }
    await deps.wait(delayMs);
    delayMs = Math.min(delayMs * POLL_DELAY_GROWTH, MAX_POLL_DELAY_MS);
  }
}

/**
 * Creates the function that reads an ODC listing's Parquet copy: it asks the
 * open-data edge function for the copy, waits while it builds, and downloads
 * its parts.
 *
 * @returns A function resolving to the downloaded copy, or `undefined` when
 *   this Avandar instance builds no copies, so the caller can read the
 *   source instead. It throws `OpenDataParquetCopyError` when the build
 *   failed or outlasted the wait.
 */
export function createOpenDataParquetCopyFetcher(
  deps: OpenDataParquetCopyFetcherDependencies,
): (
  catalogListingId: DataCatalogListing.Id,
) => Promise<FetchedOpenDataParquetCopy | undefined> {
  return async (catalogListingId) => {
    const answer = await _requestUntilBuilt(catalogListingId, deps);
    if (answer.status === "unavailable") {
      return undefined;
    }
    if (answer.status === "failed") {
      throw new OpenDataParquetCopyError({
        catalogListingId,
        reason: "failed",
        failureCode: answer.failureCode,
      });
    }
    return {
      partBlobs: await promiseMap(answer.partPaths, deps.downloadPart),
      sourceVersion: answer.sourceVersion,
      isStale: answer.isStale,
    };
  };
}

/**
 * Reads an ODC listing's Parquet copy. See
 * `createOpenDataParquetCopyFetcher`.
 */
export const fetchOpenDataParquetCopy = createOpenDataParquetCopyFetcher({
  requestCopy: (catalogListingId) => {
    return requestOpenDataParquetCopy(catalogListingId);
  },
  downloadPart: _downloadPublicPart,
  now: () => {
    return Date.now();
  },
  wait: (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },
  maxWaitMs: DEFAULT_MAX_WAIT_MS,
});
