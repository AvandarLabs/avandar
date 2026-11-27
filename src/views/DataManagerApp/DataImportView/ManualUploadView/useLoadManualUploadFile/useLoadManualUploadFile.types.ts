import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PdfOutputMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";
import type {
  BaseLoadResult,
  ManualUploadDataSourceMetadata,
} from "../../DatasetImportForm/DatasetImportForm.types";
import type {
  CsvParseOptions,
  PdfParseOptions,
  XlsxParseOptions,
} from "../../DatasetImportForm/useSaveDataset/useSaveDataset";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion/classifyRegion";
import type {
  DocumentMetadata,
  ExtractedTable,
  PageGeometry,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

type FileLoadOptions = {
  file: File;
  datasetId: Dataset.Id;
};

/** Format-specific parse settings accepted by manual file loading. */
export type ParseManualFileOptions =
  | CsvParseOptions
  | XlsxParseOptions
  | PdfParseOptions;

/** File and parse settings required to load a manual upload. */
export type LoadAndParseFileOptions = FileLoadOptions & ParseManualFileOptions;

/** Loaded CSV rows and schema retained for manual upload preview. */
export type CsvFileLoadResult = BaseLoadResult & DuckDbLoadCsvResult;

/** Loaded workbook data retained for manual upload preview. */
export type XlsxFileLoadResult = BaseLoadResult & {
  availableSheetNames: string[];
} & DuckDbLoadXlsxResult;

/** Extracted PDF regions and metadata retained for upload preview. */
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
   * The row shape the extraction actually used, which is the user's pick when
   * they made one and the shape derived from the regions' detected kinds when
   * they did not. Undefined until a region has been selected.
   *
   * Reported for the same reason `regions` is: it is what really happened, and
   * the form seeds the control from it. Defaulting the control to a fixed mode
   * instead is what offered "keep the printed table" for a line chart.
   */
  outputMode: PdfOutputMode | undefined;
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

/** Format-specific result produced by manual file loading. */
export type FileLoadResult =
  | CsvFileLoadResult
  | XlsxFileLoadResult
  | PdfFileLoadResult;

/** Load mutations and retained results exposed to the upload view. */
export type UseLoadManualUploadFileResult = {
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

  /** Forgets the loaded file's metadata and preview rows. */
  clearLoadedFile: () => void;
};
