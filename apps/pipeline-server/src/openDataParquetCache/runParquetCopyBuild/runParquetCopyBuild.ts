import { buildOpenDataParquetCache } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import { toParquetCopyFailure } from "@pipeline-server/openDataParquetCache/toParquetCopyFailure/toParquetCopyFailure";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DownloadableListing } from "@avandar/etl";
import type {
  OpenDataParquetCache,
  OpenDataParquetCacheDependencies,
} from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import type { ParquetCacheColumn } from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertToParquetParts";
import type { ParquetCopyFailure } from "@pipeline-server/openDataParquetCache/toParquetCopyFailure/toParquetCopyFailure";

/** One requested build: the listing, and the build id its claim gave it. */
export type ParquetCopyJob = Readonly<{
  catalogListingId: string;
  buildId: string;
  /**
   * A column type sample vouched for as the whole source, copied instead of
   * downloading the source.
   */
  completeSampleCsv?: string;
}>;

/** A listing as a build reads it. */
export type ParquetCopyListing = DownloadableListing &
  Readonly<{
    /** The pipeline that wrote the listing, if one did. */
    pipelineName: string | undefined;
    /** The listing's running build, if one runs. */
    currentBuildId: string | undefined;
    /** The names of the columns the catalog lists for it now. */
    columnNames: readonly string[];
  }>;

/**
 * Where a build reads its listing and records its result: the listing's
 * Supabase project and its `opendata` bucket.
 */
export type ParquetCopyStore = Pick<
  OpenDataParquetCacheDependencies,
  "uploadPart" | "removeFolder"
> & {
  readListing: (
    catalogListingId: string,
  ) => Promise<ParquetCopyListing | undefined>;
  /** Records a ready copy, only while the build is still the running one. */
  writeCopy: (
    args: ParquetCopyJob & Readonly<{ copy: OpenDataParquetCache }>,
  ) => Promise<{ isApplied: boolean; previousFolderPath: string | undefined }>;
  /** Records a failure, only while the build is still the running one. */
  failCopy: (
    args: ParquetCopyJob & Readonly<{ code: string }>,
  ) => Promise<boolean>;
  markInvalid: (args: {
    catalogListingId: string;
    reason: DataCatalogListing.InvalidDatasetReason;
  }) => Promise<void>;
  /** Replaces the listing's columns with the copy's, as verified types. */
  writeVerifiedColumns: (args: {
    catalogListingId: string;
    columns: readonly ParquetCacheColumn[];
  }) => Promise<void>;
};

/** How a build ended. */
export type ParquetCopyBuildOutcome =
  | Readonly<{ status: "superseded" }>
  | Readonly<{
      status: "written";
      copy: OpenDataParquetCache;
      /**
       * False when the copy shared no column with the listing, so its
       * columns were kept rather than replaced.
       */
      areColumnsVerified: boolean;
    }>
  | Readonly<{ status: "discarded" }>
  | Readonly<{
      status: "failed";
      failure: ParquetCopyFailure;
      /** False when a newer build had already replaced this one. */
      isRecorded: boolean;
    }>;

type RunParquetCopyBuildOptions = Readonly<{
  job: ParquetCopyJob;
  store: ParquetCopyStore;
  loadPipelineDownload: OpenDataParquetCacheDependencies["loadPipelineDownload"];
  downloadToFile: OpenDataParquetCacheDependencies["downloadToFile"];
  /** Replaces the copy builder, for tests. */
  buildCopy?: typeof buildOpenDataParquetCache;
}>;

/** Records a failure and, when the dataset is at fault, marks it invalid. */
async function _recordFailure(
  options: RunParquetCopyBuildOptions,
  failure: ParquetCopyFailure,
): Promise<ParquetCopyBuildOutcome> {
  const { job, store } = options;
  const isRecorded = await store.failCopy({ ...job, code: failure.code });
  if (isRecorded && failure.invalidReason !== undefined) {
    await store.markInvalid({
      catalogListingId: job.catalogListingId,
      reason: failure.invalidReason,
    });
  }
  return { status: "failed", failure, isRecorded };
}

/**
 * Whether a copy's columns may replace the listing's. A copy that shares no
 * column name with a listing that has columns points at a wrong file or a
 * broken header rather than a changed schema, so its columns are not
 * trusted.
 */
function _canVerifyColumns(
  listingColumnNames: readonly string[],
  copy: OpenDataParquetCache,
): boolean {
  if (listingColumnNames.length === 0) {
    return true;
  }
  const listed = new Set(listingColumnNames);
  return copy.columns.some((column) => {
    return listed.has(column.name);
  });
}

/** Records a finished copy, then deletes whichever copy is no longer named. */
async function _recordCopy(
  options: RunParquetCopyBuildOptions,
  copy: OpenDataParquetCache,
  listingColumnNames: readonly string[],
): Promise<ParquetCopyBuildOutcome> {
  const { job, store } = options;
  const { isApplied, previousFolderPath } = await store.writeCopy({
    ...job,
    copy,
  });
  if (!isApplied) {
    await store.removeFolder(copy.folderPath);
    return { status: "discarded" };
  }
  if (previousFolderPath !== undefined) {
    await store.removeFolder(previousFolderPath);
  }
  const areColumnsVerified = _canVerifyColumns(listingColumnNames, copy);
  if (areColumnsVerified) {
    await store.writeVerifiedColumns({
      catalogListingId: job.catalogListingId,
      columns: copy.columns,
    });
  }
  return { status: "written", copy, areColumnsVerified };
}

/**
 * Runs one requested build of a listing's Parquet copy and records how it
 * ended. A build that is no longer the listing's running build, because
 * its claim was given up as lost and claimed again, does nothing. A copy is
 * recorded only while its build is still the running one; otherwise it is
 * deleted. The copy it replaces is deleted once nothing names it, and the
 * copy's column types are written back as the listing's verified types,
 * since a read of the whole source is more authoritative than a sample. A
 * copy that shares no column with the listing keeps the listing's columns.
 * A job carrying a complete column type sample builds from the sample.
 *
 * @param runOptions.job The listing and the build id its claim gave it.
 * @param runOptions.store The listing's Supabase project.
 * @returns How the build ended.
 */
export async function runParquetCopyBuild(
  runOptions: RunParquetCopyBuildOptions,
): Promise<ParquetCopyBuildOutcome> {
  // The store records a build by its listing and id, so the sample, which
  // can be megabytes, stays with the build alone.
  const { completeSampleCsv, ...job } = runOptions.job;
  const options = { ...runOptions, job };
  const { store } = options;
  const listing = await store.readListing(job.catalogListingId);
  if (listing === undefined || listing.currentBuildId !== job.buildId) {
    return { status: "superseded" };
  }
  if (listing.pipelineName === undefined) {
    return await _recordFailure(options, { code: "copy-unsupported" });
  }
  const buildCopy = options.buildCopy ?? buildOpenDataParquetCache;
  let copy: OpenDataParquetCache;
  try {
    copy = await buildCopy({
      listing: { ...listing, pipelineName: listing.pipelineName },
      buildId: job.buildId,
      completeSampleCsv,
      dependencies: {
        loadPipelineDownload: options.loadPipelineDownload,
        downloadToFile: options.downloadToFile,
        uploadPart: store.uploadPart,
        removeFolder: store.removeFolder,
      },
    });
  } catch (error) {
    return await _recordFailure(options, toParquetCopyFailure(error));
  }
  return await _recordCopy(options, copy, listing.columnNames);
}
