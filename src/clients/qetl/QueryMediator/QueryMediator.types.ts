import type {
  DatasetDuckDbLease,
  PublicSnapshotDuckDbOwner,
} from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { UnknownObject } from "@avandar/utils";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { OpenDataDataset } from "$/models/datasets/OpenDataDataset/OpenDataDataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { XlsxFileDataset } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

/** A column whose stored name or type differs from the source data. */
export type ColumnReplacement = {
  /** The original name of the column from the source data. */
  originalName: string;
  /** The new name of the column. */
  alias?: string;
  /** The new data type of the column. */
  dataType?: DuckDbDataType;
};

/** A dataset paired with the source record that says how to fetch it. */
export type RelationSource =
  | {
      sourceType: "csv_file";
      sourceDataset: CsvFileDataset.T;
      dataset: Dataset.T;
    }
  | {
      sourceType: "google_sheets";
      dataset: Dataset.T;
      sourceDataset: GoogleSheetsDataset.T;
    }
  | {
      sourceType: "open_data";
      dataset: Dataset.T;
      sourceDataset: OpenDataDataset.T;
    }
  | {
      sourceType: "virtual";
      sourceDataset: VirtualDataset.T;
      dataset: Dataset.T;
    }
  | {
      sourceType: "xlsx_file";
      dataset: Dataset.T;
      sourceDataset: XlsxFileDataset.T;
    };

/**
 * One dataset's parquet bytes, ready to load into the queryable relation
 * cache.
 */
export type AcquiredRelationBytes = {
  datasetId: Dataset.Id;
  parquetBlob: Blob;
};

/** The per-workspace or per-snapshot policy a query runner is built from. */
export type QetlRunnerOptions = {
  getQueryDependencies: (rawSql: string) => Promise<Dataset.Id[]>;
  getDuckDbLeaseDatasetIds?: (
    queryDependencies: readonly Dataset.Id[],
  ) => Promise<Dataset.Id[]>;
  duckDbReadMode?: "public" | "workspace";
  publicSnapshotDuckDbOwner?: PublicSnapshotDuckDbOwner;
  insertToStorageCache: (
    relations: ReadonlyArray<{ datasetId: Dataset.Id; parquetBlob: Blob }>,
  ) => Promise<void>;
  prepareDuckDbDatasets?: (
    params: Readonly<{
      datasetIds: readonly Dataset.Id[];
      datasetDuckDbLease: DatasetDuckDbLease;
    }>,
  ) => Promise<void>;
};

/** Datasets grouped by their source type. */
export type DatasetsBySourceType = Record<Dataset.T["sourceType"], Dataset.T[]>;

/** Datasets keyed by their ID. */
export type DatasetsById = Record<Dataset.Id, Dataset.T | undefined>;

/** Options for one Qetl query. */
export type RunQetlQueryOptions = {
  rawSql: string;
  returnType?: "parquet" | "js";
  datasetDuckDbLease?: DatasetDuckDbLease;
  signal?: AbortSignal;
};

/** The overloaded `runQuery` a Qetl client exposes. */
export type QetlRunQuery = {
  (
    options: Readonly<RunQetlQueryOptions & { returnType: "parquet" }>,
  ): Promise<Blob>;
  <RowObject extends UnknownObject = UnknownRow>(
    options: Readonly<RunQetlQueryOptions & { returnType?: "js" }>,
  ): Promise<QueryResult.T<RowObject>>;
};

/** Options for the part of a Qetl query that runs under a held lease. */
export type RunLeasedQueryOptions = {
  datasetDuckDbLease: DatasetDuckDbLease;
  queryDependencies: readonly Dataset.Id[];
  rawSql: string;
  returnType: "parquet" | "js";
  signal?: AbortSignal;
};
