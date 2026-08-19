import { useMutation, UseMutationResultTuple } from "@avandar/query-hooks";
import { MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { uuid } from "$/lib/uuid";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { UserId } from "$/models/User/User.types";
import { useState } from "react";
import { match } from "ts-pattern";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { makeCsvFromPdfTable } from "@/clients/datasets/makeCsvFromPdfTable/makeCsvFromPdfTable";
import { extractPdfRegions } from "@/clients/datasets/pdfSniff";
import { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import {
  BaseLoadResult,
  ManualUploadDataSourceMetadata,
} from "../../DatasetImportForm/DatasetImportForm.types";
import {
  CsvParseOptions,
  PdfParseOptions,
  XlsxParseOptions,
} from "../../DatasetImportForm/useSaveDataset/useSaveDataset";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion/classifyRegion";
import type {
  DocumentMetadata,
  ExtractedTable,
  PageGeometry,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";

type FileLoadOptions = {
  file: File;
  datasetId: Dataset.Id;
};

export type ParseManualFileOptions =
  | CsvParseOptions
  | XlsxParseOptions
  | PdfParseOptions;

type LoadAndParseFileOptions = FileLoadOptions & ParseManualFileOptions;

export type CsvFileLoadResult = BaseLoadResult & DuckDbLoadCsvResult;

export type XlsxFileLoadResult = BaseLoadResult & {
  availableSheetNames: string[];
} & DuckDbLoadXlsxResult;

export type PdfFileLoadResult = BaseLoadResult & {
  /**
   * Identifies this particular load, so re-parsing remounts the import form.
   * The CSV and XLSX results get theirs from the DuckDB load result; a PDF
   * never touches DuckDB during the sniff, so it is minted here.
   */
  id: string;
  type: "pdf";
  pageCount: number;
  /** Geometry for the pages read, so the picker can render and clip them. */
  pages: readonly PageGeometry[];
  /**
   * `needs_selection` means the document parsed fine and is waiting for the
   * user to choose a region. It is NOT an error, and the form must not treat
   * it as one.
   */
  status: "needs_selection" | "extracted";
  /**
   * The regions as they were actually read, which is the requested regions
   * with each classified shape written back into them.
   *
   * Without this the picker's "Read as" control shows the shape the region was
   * created with rather than the one the rows in front of the user came out
   * of, and a user correcting a shape would be correcting a value that was
   * never used.
   */
  regions: readonly PdfRegion[];
  columns: DuckDbColumnSchema[];
  /** One per selected region, for the review grid. */
  tables: readonly ExtractedTable[];
  classifications: Readonly<Record<string, RegionClassification>>;
  documentMetadata: DocumentMetadata;
  /**
   * The combined result the dataset is actually built from. Kept alongside
   * `tables` because the fingerprint and the CSV are computed from the
   * combination, not from any single region.
   */
  combinedCells: ReadonlyArray<readonly string[]>;
  combinedHeaderRows: number;
};

type FileLoadResult =
  | CsvFileLoadResult
  | XlsxFileLoadResult
  | PdfFileLoadResult;

type UseLoadManualUploadFileResult = {
  loadFile: UseMutationResultTuple<FileLoadResult, LoadAndParseFileOptions>[0];
  isLoadingFile: UseMutationResultTuple<
    FileLoadResult,
    LoadAndParseFileOptions
  >[1];
  dataSourceMetadata: ManualUploadDataSourceMetadata | undefined;
  setDataSourceMetadata: (
    newDataSourceMetadata: ManualUploadDataSourceMetadata | undefined,
  ) => void;
  previewRows: UnknownRow[] | undefined;
};

const EMPTY_PARQUET_PLACEHOLDER = new Blob([], {
  type: MIMEType.APPLICATION_PARQUET,
});

/**
 * Convert XLSX sniff preview rows (object keyed by column name with raw
 * cell values) to the column schema shape DuckDB returns from CSV /
 * Parquet sniffs. We can't infer DuckDB types from SheetJS values without
 * additional logic; default to VARCHAR for everything in the sniff phase.
 * The background parquet transcoding (the actual `read_xlsx` transcode)
 * reconciles to the real types via `LocalDatasetClient._reconcileColumns`.
 */
function _xlsxColumnNamesToSchema(columnNames: string[]): DuckDbColumnSchema[] {
  return columnNames.map((name) => {
    return {
      column_name: name,
      column_type: "VARCHAR",
      null: "YES",
      key: null,
      default: null,
      extra: null,
    };
  });
}

function _buildDataSourceMetadataFromLoadResult({
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
        loadAndParseOptions?.type === "csv_file" ?
          loadAndParseOptions
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
          loadAndParseOptions?.type === "xlsx_file" ?
            loadAndParseOptions
          : undefined;
        const defaultSheetName =
          xlsxLoadResult.availableSheetNames.length === 1 ?
            xlsxLoadResult.availableSheetNames[0]
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
        loadAndParseOptions?.type === "pdf_file" ?
          loadAndParseOptions
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
          outputMode: pdfRequest?.outputMode ?? "natural",
          // Carried through re-parses so the model that contributed rows is
          // still known at save time, whichever re-extraction wrote them.
          llmModel: pdfRequest?.llmModel,
        },
      };
    })
    .exhaustive();
}

/**
 * Loads a manually uploaded file into our local storage and DuckDB in two
 * named phases:
 *
 *   - The sniff phase (awaited by this hook): a fast sniff that produces
 *     the column schema, parse dialect, and a 200-row preview. CSV uses
 *     DuckDB's `sniff_csv` + LIMIT-pushdown read; XLSX uses a SheetJS sniff
 *     worker so the parse runs off the main thread.
 *
 *   - The background parquet transcoding (fired by `startCsvImport` /
 *     `startXlsxImport`): the full `read_csv` / `read_xlsx` → parquet
 *     transcode. Status is tracked in IndexedDB on the LocalDataset row
 *     (`parseStatus`) and in memory via the `ImportJobsManager`. It emits
 *     its own completion toast and column-discrepancy warning.
 *
 * Returns immediately after the sniff phase so the import form can render.
 * The caller may save the dataset before the background parquet transcoding
 * completes; the parquet upload to Supabase storage waits on the background
 * parquet transcoding internally via `ImportJobsManager.waitForCompletion`.
 *
 * IMPORTANT: this does **not** save the dataset to the backend database;
 * that's `useSaveDataset`.
 */
export function useLoadManualUploadFile(): UseLoadManualUploadFileResult {
  const { t } = useLingui();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    ManualUploadDataSourceMetadata | undefined
  >();
  const [previewRows, setPreviewRows] = useState<UnknownRow[] | undefined>();

  // Captures the most recent sniff's preview rows so we can hand them to
  // state in `onSuccess`. We can't widen the mutation's return type here
  // without churning every consumer that already calls `loadFile`, so a
  // ref carries the side channel.
  const pendingPreviewRowsRef = useState<{ value: UnknownRow[] | undefined }>(
    () => {
      return { value: undefined };
    },
  )[0];

  const [loadManualUploadFile, isLoadingManualUploadFile] = useMutation({
    mutationFn: async (
      options: LoadAndParseFileOptions,
    ): Promise<FileLoadResult> => {
      const { file } = options;
      return match(options)
        .with({ type: "csv_file" }, async (csvParseOptions) => {
          const { datasetId, numRowsToSkip, delimiter } = csvParseOptions;
          const sniff = await LocalDatasetClient.startCsvImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            parseOptions: { numRowsToSkip, delimiter },
          });
          // Synthesize a `DuckDbLoadCsvResult` from the sniff phase so the
          // existing import form / save mutation can consume it
          // unchanged. `parquetData` isn't real yet; the background parquet
          // transcoding will write the actual parquet into the LocalDataset
          // row independently. `numRows` is unknown at the sniff phase; the
          // toast and save mutation don't error on a fractional value.
          const loadResult: CsvFileLoadResult = {
            datasetId,
            numRows: sniff.previewRows.length,
            id: uuid() as DuckDbLoadCsvResult["id"],
            type: "csv",
            tableName: datasetId,
            csvName: datasetId,
            columns: sniff.columns,
            csvSniff: sniff.csvSniff,
            errors: { rejectedScans: [], rejectedRows: [] },
            numRejectedRows: 0,
            parquetData: EMPTY_PARQUET_PLACEHOLDER,
          };
          pendingPreviewRowsRef.value = sniff.previewRows;
          return loadResult;
        })
        .with({ type: "xlsx_file" }, async (xlsxParseOptions) => {
          const { datasetId, sheetName, hasHeader } = xlsxParseOptions;
          const sniff = await LocalDatasetClient.startXlsxImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            parseOptions: { sheet: sheetName, hasHeader },
          });
          const loadResult: XlsxFileLoadResult = {
            datasetId,
            numRows: sniff.previewRows.length,
            id: uuid() as DuckDbLoadXlsxResult["id"],
            type: "xlsx",
            tableName: datasetId,
            xlsxName: datasetId,
            columns: _xlsxColumnNamesToSchema(sniff.columns),
            sheet: sniff.defaultSheet,
            parquetData: EMPTY_PARQUET_PLACEHOLDER,
            availableSheetNames: sniff.sheets,
          };
          pendingPreviewRowsRef.value = sniff.previewRows as UnknownRow[];
          return loadResult;
        })
        .with({ type: "pdf_file" }, async (pdfParseOptions) => {
          const {
            datasetId,
            pageRange,
            regions = [],
            outputMode,
          } = pdfParseOptions;
          const sniff = await LocalDatasetClient.startPdfImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            parseOptions: { pageRange },
          });

          if (regions.length === 0) {
            // No regions yet, so no rows and no columns yet. This is the
            // expected state immediately after upload, not a failure.
            const loadResult: PdfFileLoadResult = {
              datasetId,
              numRows: 0,
              id: uuid(),
              type: "pdf",
              pageCount: sniff.pageCount,
              pages: sniff.pages,
              status: "needs_selection",
              regions: [],
              columns: [],
              tables: [],
              classifications: {},
              documentMetadata: sniff.documentMetadata,
              combinedCells: [],
              combinedHeaderRows: 0,
            };
            pendingPreviewRowsRef.value = [];
            return loadResult;
          }

          const extracted = await extractPdfRegions({
            pages: sniff.pages,
            regions,
            documentMetadata: sniff.documentMetadata,
            outputMode,
          });

          // What each region was read as, written back into the region. The
          // worker decided this, weighing the user's choice against the
          // classifier's; repeating that judgement here would be a second
          // place for the two to disagree.
          const readRegions = regions.map((region): PdfRegion => {
            const shape = extracted.resolvedShapes[region.id];
            return shape === undefined || shape === region.shape ?
                region
              : { ...region, shape };
          });

          // Reuse the CSV import path wholesale: the extracted table is now
          // just a CSV, so DuckDB's sniffer types it exactly as it would a
          // real one. The PDF stays pinned as the retained original.
          const csv = makeCsvFromPdfTable({
            cells: extracted.combined.cells,
            headerRows: extracted.combined.headerRows,
          });
          const csvFile = new File([csv], `${datasetId}.csv`, {
            type: MIMEType.TEXT_CSV,
          });
          const csvSniff = await LocalDatasetClient.transcodePdfExtraction({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            csvFile,
          });

          const loadResult: PdfFileLoadResult = {
            datasetId,
            numRows: Math.max(
              0,
              extracted.combined.cells.length - extracted.combined.headerRows,
            ),
            id: uuid(),
            type: "pdf",
            pageCount: sniff.pageCount,
            pages: sniff.pages,
            status: "extracted",
            regions: readRegions,
            columns: csvSniff.columns,
            tables: extracted.tables,
            classifications: extracted.classifications,
            documentMetadata: sniff.documentMetadata,
            combinedCells: extracted.combined.cells,
            combinedHeaderRows: extracted.combined.headerRows,
          };
          pendingPreviewRowsRef.value = csvSniff.previewRows;
          return loadResult;
        })
        .exhaustive();
    },
    onSuccess: (loadResult, inputParams) => {
      const file = inputParams.file;
      setDataSourceMetadata(
        _buildDataSourceMetadataFromLoadResult({
          loadResult,
          file,
          loadAndParseOptions: inputParams,
        }),
      );
      setPreviewRows(pendingPreviewRowsRef.value);
      pendingPreviewRowsRef.value = undefined;
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      notifyError({
        title: t`Could not read file`,
        message,
      });
    },
  });

  return {
    loadFile: loadManualUploadFile,
    isLoadingFile: isLoadingManualUploadFile,
    previewRows,
    dataSourceMetadata,
    setDataSourceMetadata,
  };
}
