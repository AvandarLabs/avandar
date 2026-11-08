import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildParquetCacheObjectPath } from "@pipeline-server/openDataParquetCache/buildParquetCacheObjectPath/buildParquetCacheObjectPath";
import { summarizeParquetFile } from "@pipeline-server/openDataParquetCache/convertCsvFileToParquetFile/convertCsvFileToParquetFile";
import type {
  ParquetCacheColumn,
  ParquetFileSummary,
} from "@pipeline-server/openDataParquetCache/convertCsvFileToParquetFile/convertCsvFileToParquetFile";
import type { OpenDataSourceDownload } from "@pipeline-server/openDataParquetCache/resolveOpenDataSourceDownload/resolveOpenDataSourceDownload";

/** The steps of a build that reach a network, a source, or Storage. */
export type OpenDataParquetCacheDependencies = {
  /** Finds where the listing's whole source is downloaded from. */
  resolveSourceDownload: () => Promise<OpenDataSourceDownload>;
  /** Streams the source to a file, returning its size in bytes. */
  downloadToFile: (args: { url: string; filePath: string }) => Promise<number>;
  /** Converts a CSV file to a Parquet file. */
  convertCsvToParquet: (args: {
    csvPath: string;
    parquetPath: string;
  }) => Promise<ParquetFileSummary>;
  /** Uploads the Parquet file to `objectPath` in the `opendata` bucket. */
  uploadParquet: (args: {
    objectPath: string;
    parquetPath: string;
  }) => Promise<void>;
  /** Deletes an object from the `opendata` bucket. */
  removeObject: (objectPath: string) => Promise<void>;
};

/** The Parquet copy a build wrote. */
export type OpenDataParquetCache = Readonly<{
  objectPath: string;
  /** The freshness token of the source the copy was built from. */
  sourceVersion: string;
  rowCount: number;
  byteSize: number;
  columns: readonly ParquetCacheColumn[];
}>;

/**
 * Downloads the source and returns the path of a Parquet file holding it,
 * with what that file holds.
 */
async function _writeParquetFile(args: {
  download: OpenDataSourceDownload;
  tempDir: string;
  dependencies: OpenDataParquetCacheDependencies;
}): Promise<{ parquetPath: string; summary: ParquetFileSummary }> {
  const { download, tempDir, dependencies } = args;
  if (download.contentKind === "parquet") {
    const parquetPath = join(tempDir, "source.parquet");
    await dependencies.downloadToFile({
      url: download.url,
      filePath: parquetPath,
    });
    return { parquetPath, summary: await summarizeParquetFile(parquetPath) };
  }
  const csvPath = join(tempDir, "source.csv");
  const parquetPath = join(tempDir, "copy.parquet");
  await dependencies.downloadToFile({ url: download.url, filePath: csvPath });
  const summary = await dependencies.convertCsvToParquet({
    csvPath,
    parquetPath,
  });
  // The CSV can be far larger than the Parquet, so it goes before the upload.
  await rm(csvPath, { force: true });
  return { parquetPath, summary };
}

/**
 * Builds a Parquet copy of an API-backed catalog listing's whole source and
 * uploads it to the `opendata` bucket. The source is streamed to a temp file
 * and converted on disk, so a source of any size can be copied: the only
 * limit is what Storage accepts.
 *
 * A source that reports no freshness token is versioned by when it was
 * built, so every build of it writes a new object.
 *
 * Recording the copy on the listing is the caller's job, so a failed write
 * there leaves an orphaned object rather than a listing that names a missing
 * one.
 *
 * @param options.catalogListingId The listing.
 * @param options.previousObjectPath The listing's current copy, deleted once
 *   the new one is uploaded.
 * @param options.dependencies The network, source, and Storage steps.
 * @returns The copy that was written.
 */
export async function buildOpenDataParquetCache(
  options: Readonly<{
    catalogListingId: string;
    previousObjectPath: string | undefined;
    dependencies: OpenDataParquetCacheDependencies;
  }>,
): Promise<OpenDataParquetCache> {
  const { catalogListingId, previousObjectPath, dependencies } = options;
  const download = await dependencies.resolveSourceDownload();
  const sourceVersion =
    download.sourceVersion ?? `built:${new Date().toISOString()}`;
  const objectPath = buildParquetCacheObjectPath({
    catalogListingId,
    sourceVersion,
  });
  const tempDir = await mkdtemp(join(tmpdir(), "odc-parquet-cache-"));
  try {
    const { parquetPath, summary } = await _writeParquetFile({
      download,
      tempDir,
      dependencies,
    });
    const byteSize = (await stat(parquetPath)).size;
    await dependencies.uploadParquet({ objectPath, parquetPath });
    if (previousObjectPath !== undefined && previousObjectPath !== objectPath) {
      await dependencies.removeObject(previousObjectPath);
    }
    return { objectPath, sourceVersion, byteSize, ...summary };
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}
