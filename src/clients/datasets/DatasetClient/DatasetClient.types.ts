import type { ILogger } from "@avandar/logger";
import type { ExcludeNullsIn, FiltersByColumn } from "@avandar/utils";
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetParsers } from "$/models/datasets/Dataset/DatasetParsers";
import type {
  PdfOutputMode,
  PdfRegion,
  PdfTableFingerprint,
} from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { CompositeTypes } from "$/types/database.types";
import type { SetOptional } from "type-fest";

/** One column of a dataset as the insert RPCs expect it. */
export type DatasetColumnInput = SetOptional<
  ExcludeNullsIn<CompositeTypes<"dataset_column_input">>,
  "description"
>;

/** The database read shape the dataset parsers accept. */
export type DatasetDBRead = Parameters<
  typeof DatasetParsers.fromDBReadToModelRead
>[0];

/** The fields every dataset insert RPC takes. */
export type BaseDatasetInsertParams = {
  datasetId: Dataset.Id;
  workspaceId: Workspace.Id;
  datasetName: string;
  datasetDescription: string;
  columns: readonly DatasetColumnInput[];
};

/** The CSV dialect a CSV-backed dataset was imported with. */
export type CsvDatasetParseOptions = {
  rowsToSkip: number;
  quoteChar: string;
  escapeChar: string;
  delimiter: string;
  newlineDelimiter: string;
  commentChar: string;
  hasHeader: boolean;
  dateFormat?: string;
  timestampFormat?: string;
};

/** Parameters for creating a CSV-backed dataset. */
export type CsvDatasetInsertParams = BaseDatasetInsertParams & {
  isInCloudStorage: boolean;
  sizeInBytes: number;
  parseOptions: CsvDatasetParseOptions;
};

/** Parameters for creating an XLSX-backed dataset. */
export type XlsxDatasetInsertParams = BaseDatasetInsertParams & {
  isInCloudStorage: boolean;
  sizeInBytes: number;
  rowsToSkip: number;
  sheetName?: string;
  hasHeader: boolean;
  dateFormat?: string;
  timestampFormat?: string;
};

/** Parameters for creating a PDF-backed dataset. */
export type PdfDatasetInsertParams = BaseDatasetInsertParams & {
  isInCloudStorage: boolean;
  sizeInBytes: number;
  hasOriginalFile: boolean;
  /** One entry per extracted region, each with its own shape and options. */
  regions: readonly PdfRegion[];
  /** Defaults to `natural` in the RPC when omitted. */
  outputMode?: PdfOutputMode;
  /** Omitted when the rows came from rules alone. */
  llmModel?: string;
  pageRangeStart?: number;
  pageRangeEnd?: number;
  fingerprint: PdfTableFingerprint;
};

/** Parameters for creating a Google Sheets-backed dataset. */
export type GoogleSheetsDatasetInsertParams = BaseDatasetInsertParams & {
  rowsToSkip: number;
  googleAccountId: string;
  googleDocumentId: string;
};

/**
 * The generated CRUD operations that the extra mutations and queries reuse.
 *
 * They are injected rather than imported so those units do not have to import
 * the client they are wired into.
 */
export type DatasetClientCrud = {
  delete: (params: Readonly<{ id: Dataset.Id }>) => Promise<unknown>;
  getAll: (
    params?: Readonly<{ where?: FiltersByColumn<Dataset.T<"DBRead">> }>,
  ) => Promise<Dataset.T[]>;
  getById: (
    params: Readonly<{ id: Dataset.Id }>,
  ) => Promise<Dataset.T | undefined>;
};

/** The extra dataset mutations layered on top of the CRUD client. */
export type DatasetMutationRecord = {
  insertVirtualDataset: (
    params: Readonly<BaseDatasetInsertParams & { rawSql: string }>,
  ) => Promise<Dataset.T>;
  insertCsvFileDataset: (
    params: Readonly<CsvDatasetInsertParams>,
  ) => Promise<Dataset.T>;
  insertXlsxFileDataset: (
    params: Readonly<XlsxDatasetInsertParams>,
  ) => Promise<Dataset.T>;
  insertPdfFileDataset: (
    params: Readonly<PdfDatasetInsertParams>,
  ) => Promise<Dataset.T>;
  insertGoogleSheetsDataset: (
    params: Readonly<GoogleSheetsDatasetInsertParams>,
  ) => Promise<Dataset.T>;
  insertOpenDataDataset: (
    params: Readonly<
      BaseDatasetInsertParams & { catalogEntryId: OpenDataCatalogEntry.Id }
    >,
  ) => Promise<Dataset.T>;
  fullDelete: (params: Readonly<{ id: Dataset.Id }>) => Promise<void>;
};

/** The wiring the extra dataset mutations are built from. */
export type DatasetMutationConfig = {
  client: DatasetClientCrud;
  logger: ILogger;
  parsers: typeof DatasetParsers;
};

/** The wiring the extra dataset queries are built from. */
export type DatasetQueryConfig = {
  client: DatasetClientCrud;
  clientLogger: ILogger;
  dbClient: AvaSupabaseDBClient;
  parsers: typeof DatasetParsers;
};
