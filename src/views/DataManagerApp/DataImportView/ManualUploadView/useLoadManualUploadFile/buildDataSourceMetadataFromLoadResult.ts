import { match } from "ts-pattern";
import type { ManualUploadDataSourceMetadata } from "../../DatasetImportForm/DatasetImportForm.types";
import type {
  FileLoadResult,
  LoadAndParseFileOptions,
} from "./useLoadManualUploadFile";

/** Converts a parsed manual file into its source metadata. */
export function buildDataSourceMetadataFromLoadResult({
  loadResult,
  file,
  loadAndParseOptions,
}: {
  loadResult: FileLoadResult;
  file: File;
  loadAndParseOptions?: LoadAndParseFileOptions;
}): ManualUploadDataSourceMetadata {
  return match(loadResult)
    .with({ type: "csv" }, (csvLoadResult): ManualUploadDataSourceMetadata => {
      const csvParseRequest =
        loadAndParseOptions?.type === "csv_file"
          ? loadAndParseOptions
          : undefined;
      return {
        sourceType: "csv_file",
        onlineStorageAllowed: true,
        sizeInBytes: file.size,
        datasetLoadResult: csvLoadResult,
        parseOptions: {
          type: "csv_file",
          numRowsToSkip:
            csvParseRequest?.numRowsToSkip ?? csvLoadResult.csvSniff.SkipRows,
          delimiter:
            csvParseRequest?.delimiter ?? csvLoadResult.csvSniff.Delimiter,
        },
      };
    })
    .with(
      { type: "xlsx" },
      (xlsxLoadResult): ManualUploadDataSourceMetadata => {
        const xlsxRequest =
          loadAndParseOptions?.type === "xlsx_file"
            ? loadAndParseOptions
            : undefined;
        const defaultSheetName =
          xlsxLoadResult.availableSheetNames.length === 1
            ? xlsxLoadResult.availableSheetNames[0]
            : xlsxLoadResult.sheet;
        return {
          sourceType: "xlsx_file",
          onlineStorageAllowed: true,
          sizeInBytes: file.size,
          datasetLoadResult: xlsxLoadResult,
          parseOptions: {
            type: "xlsx_file",
            sheetName: xlsxRequest?.sheetName ?? defaultSheetName,
            hasHeader: xlsxRequest?.hasHeader ?? true,
            numRowsToSkip: xlsxRequest?.numRowsToSkip ?? 0,
            dateFormat: xlsxRequest?.dateFormat ?? null,
            timestampFormat: xlsxRequest?.timestampFormat ?? null,
          },
        };
      },
    )
    .with({ type: "pdf" }, (pdfLoadResult): ManualUploadDataSourceMetadata => {
      const pdfRequest =
        loadAndParseOptions?.type === "pdf_file"
          ? loadAndParseOptions
          : undefined;
      return {
        sourceType: "pdf_file",
        // A PDF is retained in full, so the cloud-storage toggle is the
        // user's only say over whether the document leaves the device.
        // Default it on, like the other file sources.
        onlineStorageAllowed: true,
        sizeInBytes: file.size,
        datasetLoadResult: pdfLoadResult,
        parseOptions: {
          type: "pdf_file",
          // The load result's regions, not the request's: they are the same
          // regions with the shape each one was actually read as written in.
          // Taking the request's back would put the placeholder shape in front
          // of the user again on every extraction.
          regions: pdfLoadResult.regions,
          pageRange: pdfRequest?.pageRange,
          // The load result's mode, not the request's, for the same reason as
          // the regions above: it is the mode the extraction really used, and
          // on a first load the request has none for detection to lose to.
          outputMode: pdfLoadResult.outputMode ?? pdfRequest?.outputMode,
          isOutputModeUserChosen: pdfRequest?.isOutputModeUserChosen,
          // Carried through re-parses so the model that contributed rows is
          // still known at save time, whichever re-extraction wrote them.
          llmModel: pdfRequest?.llmModel,
        },
      };
    })
    .exhaustive();
}
