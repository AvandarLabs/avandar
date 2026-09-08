import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { OpenDataDataset } from "$/models/datasets/OpenDataDataset/OpenDataDataset";
import type { PdfFileDataset } from "$/models/datasets/PdfFileDataset/PdfFileDataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { XlsxFileDataset } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { PrincipalKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type { RelationCachePort } from "$/models/relations/RelationCachePort/RelationCachePort.types";
import type {
  DatasetDuckDbLease,
  PublicSnapshotDuckDbOwner,
} from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { UnknownObject } from "@avandar/utils";

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
    }
  | {
      sourceType: "pdf_file";
      dataset: Dataset.T;
      sourceDataset: PdfFileDataset.T;
    };

/**
 * One dataset's parquet bytes, ready to load into the queryable relation
 * cache.
 */
export type AcquiredRelationBytes = {
  datasetId: Dataset.Id;
  parquetBlob: Blob;
  /** The columns actually held in `parquetBlob`. */
  columns: readonly string[] | "all";
};

/** Per-dataset column sets a query needs, or `"all"` when unknown. */
export type NeededColumnsByDatasetId = Readonly<
  Record<string, readonly string[] | "all">
>;

/** The per-workspace or per-snapshot policy a query runner is built from. */
export type QetlRunnerOptions = {
  getQueryDependencies: (rawSql: string) => Promise<Dataset.Id[]>;
  /**
   * Plans the concept relations one statement names, and refuses the statement
   * when it names one the caller may not read.
   *
   * Optional because only a session with ontology access can answer it. A
   * session that supplies none (the public snapshot path, which has no ontology
   * and stores raw SQL naming `concept_<uuid>` that nothing on that path can
   * interpret) leaves a concept reference unresolved, so the query fails on a
   * missing table rather than answering from whatever happens to be in the
   * catalog.
   */
  planConceptRelations?: (rawSql: string) => Promise<ConceptRelationPlan[]>;
  getDuckDbLeaseDatasetIds?: (
    queryDependencies: readonly Dataset.Id[],
  ) => Promise<Dataset.Id[]>;
  duckDbReadMode?: "public" | "workspace";
  publicSnapshotDuckDbOwner?: PublicSnapshotDuckDbOwner;
  /**
   * The storage tier this session may read and write, and the principal every
   * entry in it is scoped to.
   *
   * These replace the old `insertToStorageCache` callback, which only wrote.
   * Reading went to `LocalDataset` unconditionally, so a public snapshot query
   * probed the **workspace** store: it wrote its bytes to `LocalPublicDataset`
   * and then never read them back. Holding a port instead means a session can
   * only reach its own tier, and the public implementation refuses a
   * workspace-form principal structurally rather than by a predicate someone
   * has to remember to write.
   */
  relationCache: RelationCachePort;
  principalKey: PrincipalKey;
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
  /**
   * The columns each dataset must hold, when the caller already knows them.
   *
   * `getNeededColumnsFromQuery` infers this from the statement, but it can
   * only do so for a plain read: a `CREATE TABLE AS SELECT` has no top-level
   * select list to read, so it fails wide to `"all"` and the query downloads
   * every column of every relation it names. Individual generation is exactly
   * that shape and knows its answer exactly (an identifier column and a label
   * column per contributing dataset), so it states it rather than paying for
   * columns nothing reads.
   *
   * Named datasets not listed here still fall back to inference, and a listed
   * set that is too narrow fails the query on a missing column rather than
   * answering from partial data, so this is a caller assertion and not a hint.
   */
  neededColumnsByDatasetId?: NeededColumnsByDatasetId;
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
  /** Concept relations to register once the datasets they read are loaded. */
  conceptRelations: readonly ConceptRelationPlan[];
  rawSql: string;
  returnType: "parquet" | "js";
  signal?: AbortSignal;
  /** The caller's stated column sets, overriding inference per dataset. */
  neededColumnsByDatasetId?: NeededColumnsByDatasetId;
};
