import { ParquetCopyError } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import { PIPELINE_DOWNLOAD_MISSING_ERROR_NAME } from "@pipeline-server/openDataParquetCache/loadPipelineListingDownload/loadPipelineListingDownload";
import { SourceDownloadFailedError } from "@pipeline-server/openDataParquetCache/streamUrlToFile/streamUrlToFile";
import { failureToInvalidDatasetReason } from "$/connectors/open-data/failureToInvalidDatasetReason/failureToInvalidDatasetReason";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/** Why a build failed, as it is recorded on the listing. */
export type ParquetCopyFailure = Readonly<{
  /** The failure code the listing records. */
  code: string;
  /**
   * Set when the failure shows the dataset itself cannot be loaded, so the
   * listing is marked invalid with this reason.
   */
  invalidReason?: DataCatalogListing.InvalidDatasetReason;
}>;

/**
 * DuckDB's messages for a CSV or JSON file it cannot read as the table it
 * declares.
 */
const _UNPARSEABLE_MESSAGE = /CSV Error|Conversion Error|JSON transform error/;

/**
 * DuckDB's message for a conversion that reached its memory limit, such as a
 * JSON source whose one response is larger than a JSON copy may hold.
 */
const _OUT_OF_MEMORY_MESSAGE = /Out of Memory Error/;

function _fromDownloadStatus(status: number): ParquetCopyFailure {
  if (status === 404 || status === 410) {
    return { code: "source-not-found", invalidReason: "dataset_not_found" };
  }
  if (status === 401 || status === 403) {
    return {
      code: "source-authorization-required",
      invalidReason: "authorization_required",
    };
  }
  return { code: "source-download-failed" };
}

/**
 * Turns a failed build's error into the failure its listing records. A
 * failure that only shows a service is down, or that is the server's own,
 * never marks the listing invalid. A source too large for the conversion's
 * memory limit is `copy-too-large`, which leaves the listing valid. Failure
 * codes from reading the source through a catalog API are the same ones the
 * column type sample records.
 *
 * @param error - What the build threw.
 * @returns The failure code, and the invalid reason when there is one.
 */
export function toParquetCopyFailure(error: unknown): ParquetCopyFailure {
  if (error instanceof OpenDataAcquisitionFailed) {
    const invalidReason = failureToInvalidDatasetReason(error.failure);
    return {
      code: error.failure.code,
      ...(invalidReason === undefined ? {} : { invalidReason }),
    };
  }
  if (error instanceof ParquetCopyError) {
    return error.code === "source-empty"
      ? { code: error.code, invalidReason: "empty_dataset" }
      : { code: error.code };
  }
  if (error instanceof SourceDownloadFailedError) {
    return _fromDownloadStatus(error.status);
  }
  if (!(error instanceof Error)) {
    return { code: "build-failed" };
  }
  if (error.name === PIPELINE_DOWNLOAD_MISSING_ERROR_NAME) {
    return { code: "copy-unsupported" };
  }
  if (_OUT_OF_MEMORY_MESSAGE.test(error.message)) {
    return { code: "copy-too-large" };
  }
  if (_UNPARSEABLE_MESSAGE.test(error.message)) {
    return { code: "source-unparseable", invalidReason: "unparseable_dataset" };
  }
  return { code: "build-failed" };
}
