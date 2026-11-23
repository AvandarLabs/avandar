import { ParquetCopyError } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import { PIPELINE_DOWNLOAD_MISSING_ERROR_NAME } from "@pipeline-server/openDataParquetCache/loadPipelineListingDownload/loadPipelineListingDownload";
import { SourceDownloadFailedError } from "@pipeline-server/openDataParquetCache/streamUrlToFile/streamUrlToFile";
import { toParquetCopyFailure } from "@pipeline-server/openDataParquetCache/toParquetCopyFailure/toParquetCopyFailure";
import { describe, expect, it } from "vitest";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors";

function _namedError(name: string, message = "failed"): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe("toParquetCopyFailure", () => {
  it.each([
    [
      "a missing CKAN resource",
      new OpenDataAcquisitionFailed({
        code: "resource-not-found",
        ckanResourceId: "r",
      }),
      { code: "resource-not-found", invalidReason: "dataset_not_found" },
    ],
    [
      "a CKAN outage, which says nothing about the dataset",
      new OpenDataAcquisitionFailed({ code: "ckan-unreachable", action: "a" }),
      { code: "ckan-unreachable" },
    ],
    [
      "a source with no rows",
      new ParquetCopyError("source-empty"),
      { code: "source-empty", invalidReason: "empty_dataset" },
    ],
    [
      "a source that changed mid-copy",
      new ParquetCopyError("source-changed"),
      { code: "source-changed" },
    ],
    [
      "a download the source no longer has",
      new SourceDownloadFailedError(404),
      { code: "source-not-found", invalidReason: "dataset_not_found" },
    ],
    [
      "a download that needs credentials",
      new SourceDownloadFailedError(403),
      {
        code: "source-authorization-required",
        invalidReason: "authorization_required",
      },
    ],
    [
      "a download the source failed to serve",
      new SourceDownloadFailedError(503),
      { code: "source-download-failed" },
    ],
    [
      "a CSV DuckDB cannot parse",
      new Error("Invalid Input Error: CSV Error on Line: 30002"),
      { code: "source-unparseable", invalidReason: "unparseable_dataset" },
    ],
    [
      "a value that does not fit its declared type",
      new Error("Conversion Error: Could not convert string 'three' to DOUBLE"),
      { code: "source-unparseable", invalidReason: "unparseable_dataset" },
    ],
    [
      "a JSON value that does not fit its declared type",
      new Error(
        'Invalid Input Error: JSON transform error in file "source.json.gz", in record/value 2: Failed to cast value to numerical: "seven"',
      ),
      { code: "source-unparseable", invalidReason: "unparseable_dataset" },
    ],
    [
      "a source too large for the conversion's memory limit",
      new Error(
        "Out of Memory Error: failed to allocate data of size 16.0 MiB (15.9 MiB/19.0 MiB used)",
      ),
      { code: "copy-too-large" },
    ],
    [
      "a pipeline whose listings cannot be copied",
      _namedError(PIPELINE_DOWNLOAD_MISSING_ERROR_NAME),
      { code: "copy-unsupported" },
    ],
    [
      "anything else",
      new Error("ENOSPC: no space left on device"),
      { code: "build-failed" },
    ],
  ])("maps %s", (_label, error, failure) => {
    expect(toParquetCopyFailure(error)).toEqual(failure);
  });
});
