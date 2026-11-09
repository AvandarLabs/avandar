import { buildParquetCachePartPaths } from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

/** The listing fields that decide what a copy request answers. */
export type ParquetCacheListingState = Pick<
  DataCatalogListing.T,
  | "accessKind"
  | "isInvalid"
  | "parquetCacheStatus"
  | "parquetCacheBuildStartedAt"
  | "parquetCacheFailureCode"
  | "parquetCacheFolderPath"
  | "parquetCachePartCount"
  | "parquetCacheSourceVersion"
  | "parquetCacheRowCount"
  | "parquetCacheByteSize"
>;

/** What a copy request answers. */
export type ParquetCacheAnswer =
  | Readonly<{
      status: "ready";
      /** The copy's parts in the `opendata` bucket, in row order. */
      partPaths: readonly string[];
      rowCount: number | undefined;
      byteSize: number | undefined;
      sourceVersion: string | undefined;
      /** True when the source has changed since the copy was built. */
      isStale: boolean;
    }>
  | Readonly<{ status: "building" }>
  | Readonly<{ status: "failed"; failureCode: string }>
  | Readonly<{
      status: "unavailable";
      reason: "not-api-backed" | "copies-unavailable";
    }>;

/** The steps a copy request takes outside the listing it read. */
export type ParquetCacheDependencies = Readonly<{
  /** False when no pipeline server is configured to build copies. */
  canStartBuilds: boolean;
  /** Reads the source's live freshness token. */
  readFreshnessToken: () => Promise<string | undefined>;
  /** Claims a build, returning its id, or `undefined` while one runs. */
  claimBuild: () => Promise<string | undefined>;
  /** Asks the pipeline server to run a claimed build. */
  startBuild: (buildId: string) => Promise<void>;
  /** Records that a claimed build could not be started. */
  recordStartFailure: (buildId: string, failureCode: string) => Promise<void>;
  now: () => Date;
}>;

/** How long a failed build waits before a request may retry it. */
const RETRY_FAILED_BUILD_AFTER_MS = 15 * 60 * 1000;

/** The failure code a build gets when the pipeline server does not answer. */
const SERVER_UNREACHABLE_CODE = "pipeline-server-unreachable";

/** Failure codes a later build cannot fix. */
const FINAL_FAILURE_CODES: ReadonlySet<string> = new Set(["copy-unsupported"]);

type BuildRequestResult = "started" | "running" | "start-failed";

/** Claims a build and starts it, releasing the claim if the start fails. */
async function _requestBuild(
  deps: ParquetCacheDependencies,
): Promise<BuildRequestResult> {
  const buildId = await deps.claimBuild();
  if (buildId === undefined) {
    return "running";
  }
  try {
    await deps.startBuild(buildId);
    return "started";
  } catch {
    await deps.recordStartFailure(buildId, SERVER_UNREACHABLE_CODE);
    return "start-failed";
  }
}

/**
 * Whether a failed build may be tried again now. A caller holding the whole
 * source need not wait: the build reads what it hands over, not the source
 * that may have failed it.
 */
function _canRetryFailedBuild(
  listing: ParquetCacheListingState,
  now: Date,
  hasCompleteSample: boolean,
): boolean {
  if (listing.isInvalid) {
    return false;
  }
  if (FINAL_FAILURE_CODES.has(listing.parquetCacheFailureCode ?? "")) {
    return false;
  }
  const startedAt = listing.parquetCacheBuildStartedAt;
  return (
    hasCompleteSample ||
    startedAt === undefined ||
    now.getTime() - new Date(startedAt).getTime() >= RETRY_FAILED_BUILD_AFTER_MS
  );
}

async function _isCopyStale(
  listing: ParquetCacheListingState,
  deps: ParquetCacheDependencies,
): Promise<boolean> {
  try {
    const token = await deps.readFreshnessToken();
    return token !== undefined && token !== listing.parquetCacheSourceVersion;
  } catch {
    return false;
  }
}

/** Serves an existing copy, asking for a rebuild when it needs one. */
async function _answerWithCopy(
  listing: ParquetCacheListingState & { parquetCacheFolderPath: string },
  partCount: number,
  deps: ParquetCacheDependencies,
  hasCompleteSample: boolean,
): Promise<ParquetCacheAnswer> {
  const isStale = await _isCopyStale(listing, deps);
  const needsBuild =
    isStale ||
    listing.parquetCacheStatus === "building" ||
    (listing.parquetCacheStatus === "failed" &&
      _canRetryFailedBuild(listing, deps.now(), hasCompleteSample));
  if (needsBuild && deps.canStartBuilds) {
    await _requestBuild(deps);
  }
  return {
    status: "ready",
    partPaths: buildParquetCachePartPaths({
      folderPath: listing.parquetCacheFolderPath,
      partCount,
    }),
    rowCount: listing.parquetCacheRowCount,
    byteSize: listing.parquetCacheByteSize,
    sourceVersion: listing.parquetCacheSourceVersion,
    isStale,
  };
}

/** Answers for a listing with no copy: builds one, unless that cannot help. */
async function _answerWithoutCopy(
  listing: ParquetCacheListingState,
  deps: ParquetCacheDependencies,
  hasCompleteSample: boolean,
): Promise<ParquetCacheAnswer> {
  if (
    listing.parquetCacheStatus === "failed" &&
    !_canRetryFailedBuild(listing, deps.now(), hasCompleteSample)
  ) {
    return {
      status: "failed",
      failureCode: listing.parquetCacheFailureCode ?? "build-failed",
    };
  }
  if (!deps.canStartBuilds) {
    return { status: "unavailable", reason: "copies-unavailable" };
  }
  const result = await _requestBuild(deps);
  return result === "start-failed"
    ? { status: "failed", failureCode: SERVER_UNREACHABLE_CODE }
    : { status: "building" };
}

/**
 * Decides what a request for an API-backed listing's Parquet copy answers,
 * and asks for a build when one is needed. An existing copy is always
 * served, even while it is rebuilt: an old copy now is better than a correct
 * one in ten minutes. A copy is rebuilt when its source's freshness token has
 * moved, and a build that has run too long is claimed again (the claim RPC
 * decides when a running build counts as lost). A failed build is retried at
 * most every 15 minutes, and never for a listing that is invalid or cannot be
 * copied. A build whose start fails releases its claim, so the next request
 * can try again. A caller that hands over the whole source, as a complete
 * column type sample, may retry a failed build at once.
 *
 * @param args.listing The listing, as the caller may see it.
 * @param args.deps The freshness read, the claim, and the build start.
 * @param args.hasCompleteSample True when the build will copy a complete
 *   sample the caller handed over instead of reading the source.
 * @returns What to answer.
 */
export async function requestParquetCache(
  args: Readonly<{
    listing: ParquetCacheListingState;
    deps: ParquetCacheDependencies;
    hasCompleteSample?: boolean;
  }>,
): Promise<ParquetCacheAnswer> {
  const { listing, deps } = args;
  const hasCompleteSample = args.hasCompleteSample ?? false;
  if (listing.accessKind !== "api_resource") {
    return { status: "unavailable", reason: "not-api-backed" };
  }
  const folderPath = listing.parquetCacheFolderPath;
  const partCount = listing.parquetCachePartCount;
  if (folderPath !== undefined && partCount !== undefined) {
    return await _answerWithCopy(
      { ...listing, parquetCacheFolderPath: folderPath },
      partCount,
      deps,
      hasCompleteSample,
    );
  }
  return await _answerWithoutCopy(listing, deps, hasCompleteSample);
}

/**
 * The HTTP status a copy request answers with: 200 with a copy, 202 while
 * one builds, 409 when this listing's copy cannot be built, and 503 when no
 * pipeline server is configured to build copies.
 */
export function parquetCacheAnswerToStatus(answer: ParquetCacheAnswer): number {
  switch (answer.status) {
    case "ready":
      return 200;
    case "building":
      return 202;
    case "failed":
      return 409;
    case "unavailable":
      return answer.reason === "copies-unavailable" ? 503 : 409;
  }
}
