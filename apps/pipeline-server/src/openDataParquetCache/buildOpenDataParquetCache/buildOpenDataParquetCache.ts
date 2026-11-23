import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { buildParquetCacheFolderPath } from "@pipeline-server/openDataParquetCache/buildParquetCacheFolderPath/buildParquetCacheFolderPath";
import { convertJsonFileToParquetParts } from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertJsonFileToParquetParts/convertJsonFileToParquetParts";
import {
  convertCsvFileToParquetParts,
  convertCsvPageToParquetFile,
  mergeParquetFilesIntoPart,
  splitParquetFileIntoParts,
  summarizeParquetParts,
} from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertToParquetParts";
import { match } from "ts-pattern";
import { buildParquetCachePartName } from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath";
import { readFreshnessProbeToken } from "$/connectors/open-data/readFreshnessProbeToken/readFreshnessProbeToken";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type {
  DownloadableListing,
  ListingDownloadColumn,
  ListingDownload,
  ListingDownloadScript,
  PagedListingDownload,
  PipelineDownloadConfig,
  WholeFileListingDownload,
} from "@avandar/etl";
import type { ParquetCacheColumn } from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertToParquetParts";

/** The steps of a build that reach a pipeline, a source, or Storage. */
export type OpenDataParquetCacheDependencies = {
  /** Loads a pipeline's `download` config and its download script. */
  loadPipelineDownload: (pipelineName: string) => Promise<{
    download: PipelineDownloadConfig;
    script: ListingDownloadScript;
  }>;
  /**
   * Streams a URL to a file, gzipping it as it is written when asked, and
   * returns the file's size in bytes.
   */
  downloadToFile: (args: {
    url: string;
    filePath: string;
    isGzipped?: boolean;
  }) => Promise<number>;
  /** Uploads one part to `objectPath` in the `opendata` bucket. */
  uploadPart: (args: { objectPath: string; partPath: string }) => Promise<void>;
  /** Deletes every object under a folder of the `opendata` bucket. */
  removeFolder: (folderPath: string) => Promise<void>;
  /** Reads a listing's freshness probe, when the listing has one. */
  probeHttp: OpenDataHttp;
};

/** The Parquet copy a build wrote. */
export type OpenDataParquetCache = Readonly<{
  /** The `opendata` folder holding `part-00000.parquet` onward. */
  folderPath: string;
  partCount: number;
  /** The freshness token of the source the copy was built from. */
  sourceVersion: string;
  rowCount: number;
  byteSize: number;
  columns: readonly ParquetCacheColumn[];
}>;

/** Why a build could not write a copy of a source it could read. */
export type ParquetCopyErrorCode = "source-empty" | "source-changed";

/** A build that read its source but could not write a copy of it. */
export class ParquetCopyError extends Error {
  readonly code: ParquetCopyErrorCode;

  constructor(code: ParquetCopyErrorCode) {
    super(
      code === "source-empty"
        ? "The source has no rows to copy"
        : "The source changed while it was being copied",
    );
    this.name = "ParquetCopyError";
    this.code = code;
  }
}

/**
 * About how large each part grows: under the local Storage upload limit
 * (50 MB), so a part never needs a resumable upload.
 */
const DEFAULT_MAX_PART_BYTES = 32 * 1024 * 1024;

/**
 * Starts the name of every build's temp folder, so a server can find and
 * delete the ones a killed build left behind.
 */
export const PARQUET_COPY_TEMP_PREFIX = "odc-parquet-cache-";

/** How many times a page download is tried before the build fails. */
const PAGE_ATTEMPTS = 3;

/** What one build is writing, shared by its steps. */
type CopyContext = Readonly<{
  folderPath: string;
  tempDir: string;
  maxPartBytes: number;
  pageRetryDelayMs: number;
  dependencies: OpenDataParquetCacheDependencies;
}>;

/** What a copy's parts hold, before the copy is described. */
type WrittenParts = Readonly<{
  partCount: number;
  rowCount: number;
  byteSize: number;
  columns: readonly ParquetCacheColumn[];
}>;

/** Uploads parts in order, returning their total size in bytes. */
async function _uploadParts(
  context: CopyContext,
  partPaths: readonly string[],
): Promise<number> {
  let byteSize = 0;
  for (const partPath of partPaths) {
    byteSize += (await stat(partPath)).size;
    await context.dependencies.uploadPart({
      objectPath: `${context.folderPath}/${basename(partPath)}`,
      partPath,
    });
  }
  return byteSize;
}

/**
 * What a whole source file on disk holds, which decides how it is converted:
 * a downloaded file's own format, or CSV for a complete column type sample.
 */
type SourceFileFormat =
  | Readonly<{ contentKind: "csv" | "parquet" }>
  | Readonly<{
      contentKind: "json";
      recordsField: string;
      columns: readonly ListingDownloadColumn[];
    }>;

/** Where a whole-file source lands in the build's temp folder. */
function _getSourceFileName(download: WholeFileListingDownload): string {
  return match(download.contentKind)
    .with("csv", () => {
      return "source.csv.gz";
    })
    .with("json", () => {
      return "source.json.gz";
    })
    .with("parquet", () => {
      return "source.parquet";
    })
    .exhaustive();
}

async function _convertWholeFile(args: {
  format: SourceFileFormat;
  sourcePath: string;
  partsDir: string;
  maxPartBytes: number;
}): Promise<string[]> {
  const { format, sourcePath, ...partOptions } = args;
  return await match(format)
    .with({ contentKind: "csv" }, async () => {
      return await convertCsvFileToParquetParts({
        csvPath: sourcePath,
        ...partOptions,
      });
    })
    .with({ contentKind: "json" }, async (jsonDownload) => {
      return await convertJsonFileToParquetParts({
        jsonPath: sourcePath,
        recordsField: jsonDownload.recordsField,
        columns: jsonDownload.columns,
        ...partOptions,
      });
    })
    .with({ contentKind: "parquet" }, async () => {
      return await splitParquetFileIntoParts({
        parquetPath: sourcePath,
        ...partOptions,
      });
    })
    .exhaustive();
}

/**
 * Converts a source file on disk into parts and uploads them, deleting the
 * source file first.
 */
async function _copySourceFile(
  context: CopyContext,
  sourcePath: string,
  format: SourceFileFormat,
): Promise<WrittenParts> {
  const partsDir = join(context.tempDir, "parts");
  await mkdir(partsDir);
  const partPaths = await _convertWholeFile({
    format,
    sourcePath,
    partsDir,
    maxPartBytes: context.maxPartBytes,
  });
  // The source can be far larger than its parts, so it goes first.
  await rm(sourcePath, { force: true });
  const summary = await summarizeParquetParts(partPaths);
  if (summary.rowCount === 0) {
    throw new ParquetCopyError("source-empty");
  }
  const byteSize = await _uploadParts(context, partPaths);
  return { partCount: partPaths.length, byteSize, ...summary };
}

/**
 * Downloads a source that is one file, gzipped on disk when it is a CSV or
 * JSON, converts it into parts, and uploads them.
 */
async function _copyWholeFile(
  context: CopyContext,
  download: WholeFileListingDownload,
): Promise<WrittenParts> {
  const sourcePath = join(context.tempDir, _getSourceFileName(download));
  await context.dependencies.downloadToFile({
    url: download.url,
    filePath: sourcePath,
    isGzipped: download.contentKind !== "parquet",
  });
  return await _copySourceFile(context, sourcePath, download);
}

/**
 * Copies a column type sample that holds the whole source, so the source is
 * not downloaded again. Its column types are read from all of its rows.
 */
async function _copyCompleteSample(
  context: CopyContext,
  completeSampleCsv: string,
): Promise<WrittenParts> {
  const sourcePath = join(context.tempDir, "source.csv");
  await writeFile(sourcePath, completeSampleCsv);
  return await _copySourceFile(context, sourcePath, { contentKind: "csv" });
}

async function _sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Downloads one page to disk and converts it to Parquet, trying again after
 * a failed download, so one dropped connection costs a page rather than the
 * whole build.
 */
async function _downloadPage(args: {
  context: CopyContext;
  download: PagedListingDownload;
  afterCursor: string | undefined;
  pageIndex: number;
}): Promise<{ parquetPath: string; rowCount: number; lastCursor?: string }> {
  const { context, download, pageIndex } = args;
  const csvPath = join(context.tempDir, `page-${pageIndex}.csv`);
  const parquetPath = join(context.tempDir, `page-${pageIndex}.parquet`);
  const url = download.buildPageUrl(args.afterCursor);
  for (let attempt = 1; ; attempt += 1) {
    try {
      await context.dependencies.downloadToFile({ url, filePath: csvPath });
      break;
    } catch (error) {
      if (attempt >= PAGE_ATTEMPTS) {
        throw error;
      }
      await _sleep(context.pageRetryDelayMs * attempt);
    }
  }
  const page = await convertCsvPageToParquetFile({
    csvPath,
    parquetPath,
    columns: download.columns,
    cursorColumn: download.cursorColumn,
  });
  await rm(csvPath, { force: true });
  return { parquetPath, ...page };
}

/** Pages staged on disk until there are enough of them for a part. */
type StagedPages = { paths: string[]; byteSize: number };

/** Merges the staged pages into the next part, uploads it, and clears them. */
async function _uploadStagedPages(args: {
  context: CopyContext;
  staged: StagedPages;
  partIndex: number;
  cursorColumn: string;
}): Promise<number> {
  const { context, staged } = args;
  const partPath = join(
    context.tempDir,
    buildParquetCachePartName(args.partIndex),
  );
  await mergeParquetFilesIntoPart({
    parquetPaths: staged.paths,
    partPath,
    excludedColumn: args.cursorColumn,
  });
  const byteSize = await _uploadParts(context, [partPath]);
  await Promise.all(
    [...staged.paths, partPath].map((path) => {
      return rm(path, { force: true });
    }),
  );
  staged.paths = [];
  staged.byteSize = 0;
  return byteSize;
}

/**
 * Downloads a paged source one page at a time, staging each page as Parquet
 * and uploading a part whenever the staged pages reach the part size, so the
 * disk only ever holds about one part.
 */
async function _copyPages(
  context: CopyContext,
  download: PagedListingDownload,
  pageRows: number,
): Promise<WrittenParts> {
  const staged: StagedPages = { paths: [], byteSize: 0 };
  const written = { partCount: 0, rowCount: 0, byteSize: 0 };
  const uploadStaged = async (): Promise<void> => {
    written.byteSize += await _uploadStagedPages({
      context,
      staged,
      partIndex: written.partCount,
      cursorColumn: download.cursorColumn,
    });
    written.partCount += 1;
  };
  let afterCursor: string | undefined;
  for (let pageIndex = 0; ; pageIndex += 1) {
    const page = await _downloadPage({
      context,
      download,
      afterCursor,
      pageIndex,
    });
    written.rowCount += page.rowCount;
    staged.paths.push(page.parquetPath);
    staged.byteSize += (await stat(page.parquetPath)).size;
    if (staged.byteSize >= context.maxPartBytes) {
      await uploadStaged();
    }
    if (page.rowCount < pageRows) {
      break;
    }
    afterCursor = page.lastCursor;
  }
  if (written.rowCount === 0) {
    throw new ParquetCopyError("source-empty");
  }
  if (staged.paths.length > 0) {
    await uploadStaged();
  }
  return { ...written, columns: download.columns };
}

/** The listing a build copies, with the pipeline that wrote it. */
type BuildListing = DownloadableListing & Readonly<{ pipelineName: string }>;

/** The listing's probe token, or `undefined` when it has no probe. */
async function _readProbeToken(
  listing: BuildListing,
  dependencies: OpenDataParquetCacheDependencies,
): Promise<string | undefined> {
  if (listing.freshnessProbe === undefined) {
    return undefined;
  }
  return await readFreshnessProbeToken({
    probe: listing.freshnessProbe,
    apiBaseUrl: listing.apiBaseUrl,
    http: dependencies.probeHttp,
  });
}

/**
 * The source version a copy is built from. A listing's probe is what the
 * freshness check compares a copy against, so its token, when the listing
 * has one, wins over the download script's.
 */
async function _readStartingSourceVersion(
  listing: BuildListing,
  download: ListingDownload,
  dependencies: OpenDataParquetCacheDependencies,
): Promise<string> {
  return (
    (await _readProbeToken(listing, dependencies)) ??
    download.sourceVersion ??
    `built:${new Date().toISOString()}`
  );
}

/**
 * Fails the build when the source moved away from `sourceVersion` while it
 * was copied: by the listing's probe when it has one, or else by a paged
 * download's own freshness token. A whole file with no probe is never
 * re-checked.
 *
 * @throws `ParquetCopyError` `source-changed` when it moved.
 */
async function _assertSourceUnchanged(args: {
  listing: BuildListing;
  download: ListingDownload;
  dependencies: OpenDataParquetCacheDependencies;
  sourceVersion: string;
}): Promise<void> {
  const { listing, download, sourceVersion } = args;
  const isChanged =
    listing.freshnessProbe === undefined
      ? download.paging &&
        (await download.readSourceVersion()) !== sourceVersion
      : (await _readProbeToken(listing, args.dependencies)) !== sourceVersion;
  if (isChanged) {
    throw new ParquetCopyError("source-changed");
  }
}

async function _readDownload(
  listing: BuildListing,
  dependencies: OpenDataParquetCacheDependencies,
) {
  const { download: config, script } = await dependencies.loadPipelineDownload(
    listing.pipelineName,
  );
  const pageRows = config.paging ? config.pageRows : undefined;
  const download = await script({ listing, pageRows });
  if (download.paging !== config.paging) {
    throw new Error(
      `Pipeline "${listing.pipelineName}" sets paging: ${config.paging}, but its download script answered with paging: ${download.paging}.`,
    );
  }
  return { download, pageRows: pageRows ?? 0 };
}

/**
 * Builds a Parquet copy of an API-backed catalog listing's whole source and
 * uploads it to the `opendata` bucket as a folder of parts.
 *
 * The listing's pipeline decides how its source is downloaded: its config's
 * `download` block says whether its API pages, and its download script says
 * where each page or file is. This server knows nothing about any one API.
 * A paged source is downloaded, converted, and uploaded one part at a time,
 * so a source of any size needs only about one part of disk. A source that
 * is one file is downloaded whole, gzipped on disk when it is a CSV or JSON.
 *
 * A complete column type sample, when one is given, is copied in place of
 * the source: the source is only asked for its version. A listing with a
 * freshness probe has its probe read before and after the download, and its
 * token is the copy's source version. A copy whose source changed while it
 * downloaded mixes two versions, so it fails: by the probe when there is
 * one, or else by a paged download's own token. A failed build deletes the
 * parts it uploaded. Recording a copy on the listing, and deleting the copy
 * it replaces, is the caller's job.
 *
 * @param options.listing The listing, with the pipeline that wrote it.
 * @param options.buildId The build's id, which names the copy's folder.
 * @param options.dependencies The pipeline, source, and Storage steps.
 * @param options.maxPartBytes About how large each part grows.
 * @param options.pageRetryDelayMs How long to wait before the first retry
 *   of a failed page download. Each later retry waits longer.
 * @param options.completeSampleCsv A column type sample vouched for as the
 *   whole source, copied instead of downloading the source.
 * @returns The copy that was written.
 * @throws `ParquetCopyError` when the source is empty or changed.
 */
export async function buildOpenDataParquetCache(
  options: Readonly<{
    listing: BuildListing;
    buildId: string;
    dependencies: OpenDataParquetCacheDependencies;
    maxPartBytes?: number;
    pageRetryDelayMs?: number;
    completeSampleCsv?: string;
  }>,
): Promise<OpenDataParquetCache> {
  const { listing, dependencies } = options;
  const { download, pageRows } = await _readDownload(listing, dependencies);
  const sourceVersion = await _readStartingSourceVersion(
    listing,
    download,
    dependencies,
  );
  const folderPath = buildParquetCacheFolderPath({
    catalogListingId: listing.id,
    buildId: options.buildId,
  });
  await mkdir(tmpdir(), { recursive: true });
  const tempDir = await mkdtemp(join(tmpdir(), PARQUET_COPY_TEMP_PREFIX));
  const context: CopyContext = {
    folderPath,
    tempDir,
    maxPartBytes: options.maxPartBytes ?? DEFAULT_MAX_PART_BYTES,
    pageRetryDelayMs: options.pageRetryDelayMs ?? 2000,
    dependencies,
  };
  try {
    const { completeSampleCsv } = options;
    if (completeSampleCsv !== undefined) {
      const parts = await _copyCompleteSample(context, completeSampleCsv);
      return { folderPath, sourceVersion, ...parts };
    }
    const parts = download.paging
      ? await _copyPages(context, download, pageRows)
      : await _copyWholeFile(context, download);
    await _assertSourceUnchanged({ ...options, download, sourceVersion });
    return { folderPath, sourceVersion, ...parts };
  } catch (error) {
    await dependencies.removeFolder(folderPath);
    throw error;
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}
