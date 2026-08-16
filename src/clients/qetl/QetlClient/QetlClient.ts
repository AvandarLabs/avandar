import { createModuleFactory } from "@avandar/modules";
import {
  isDefined,
  makeBucketRecord,
  makeIdLookupRecord,
  objectKeys,
  promiseFlatMap,
  promiseMap,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import { match } from "ts-pattern";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { difference } from "@/lib/utils/arrays/difference/difference";
import type {
  DatasetDuckDbLease,
  PublicSnapshotDuckDbOwner,
} from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Module } from "@avandar/modules";
import type { UnknownObject } from "@avandar/utils";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { OpenDataDataset } from "$/models/datasets/OpenDataDataset/OpenDataDataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { XlsxFileDataset } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

export type IQetlClient = Module<
  "QetlClient",
  {
    /** Get the necessary dice to answer the given SQL query. */
    getDiceFromSql: (rawSql: string) => Promise<Dataset.Id[]>;
    /** Expand direct dependencies to every dataset lease the query may need. */
    getDuckDbLeaseDatasetIds?: (
      queryDependencies: readonly Dataset.Id[],
    ) => Promise<Dataset.Id[]>;
    /** Selects the ownership policy for final DuckDB reads. */
    duckDbReadMode?: "public" | "workspace";
    /** Identifies the public snapshot expected to own final read tables. */
    publicSnapshotDuckDbOwner?: PublicSnapshotDuckDbOwner;

    /** Insert the given facts into the local storage cache. */
    insertToStorageCache: (
      facts: ReadonlyArray<{ datasetId: Dataset.Id; parquetBlob: Blob }>,
    ) => Promise<void>;
    /** Prepares ownership state after the query's dataset leases are held. */
    prepareDuckDbDatasets?: (
      params: Readonly<{
        datasetIds: readonly Dataset.Id[];
        datasetDuckDbLease: DatasetDuckDbLease;
      }>,
    ) => Promise<void>;
  },
  {
    /**
     * Runs an OLAP query. Use `returnType: "parquet"` to materialize the full
     * result set as a Parquet blob.
     */
    runQuery: {
      <RowObject extends UnknownRow = UnknownRow>(params: {
        rawSql: string;
        returnType?: "js";
      }): Promise<QueryResult.T<RowObject>>;
      (params: { rawSql: string; returnType: "parquet" }): Promise<Blob>;
    };
  }
>;

type ColumnReplacement = {
  /** The original name of the column from the source data. */
  originalName: string;
  /** The new name of the column. */
  alias?: string;
  /** The new data type of the column. */
  dataType?: DuckDbDataType;
};

type DiceExtractor =
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

type ExtractedFact = { datasetId: Dataset.Id; parquetBlob: Blob };

function _getColumnReplacements(
  columns: readonly DatasetColumn.T[],
): ColumnReplacement[] {
  return columns
    .map((column) => {
      const hasChangedName = column.name !== column.originalName;
      const hasChangedDataType =
        column.dataType !==
        DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType);
      return hasChangedName || hasChangedDataType ?
          {
            originalName: column.originalName,
            alias: hasChangedName ? column.name : undefined,
            dataType:
              hasChangedDataType ?
                DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType)
              : undefined,
          }
        : undefined;
    })
    .filter(isDefined);
}

async function _getCachedFact(
  extractor: Readonly<DiceExtractor>,
): Promise<ExtractedFact | undefined> {
  const localDataset = await LocalDatasetClient.getById({
    id: extractor.dataset.id,
  });
  return localDataset?.parseStatus === "ready" && localDataset.parquetData ?
      { datasetId: extractor.dataset.id, parquetBlob: localDataset.parquetData }
    : undefined;
}

async function _downloadStoredDatasetFact(
  extractor: Readonly<
    Extract<DiceExtractor, { sourceType: "csv_file" | "xlsx_file" }>
  >,
): Promise<ExtractedFact> {
  const parquetBlob = await DatasetParquetStorageClient.downloadDataset({
    datasetId: extractor.dataset.id,
    workspaceId: extractor.dataset.workspaceId,
  });
  if (!parquetBlob) {
    throw new Error(
      `Failed to download data for ${extractor.sourceType} dataset '${extractor.dataset.id}' (${extractor.dataset.name})`,
    );
  }
  return { datasetId: extractor.dataset.id, parquetBlob };
}

async function _downloadOpenDataFact(
  extractor: Readonly<Extract<DiceExtractor, { sourceType: "open_data" }>>,
): Promise<ExtractedFact> {
  const catalogEntry = await OpenDataCatalogEntryClient.getOne(
    where("id", "eq", extractor.sourceDataset.catalogEntryId),
  );
  const parquetUrl = catalogEntry?.canonicalUrls?.find((url) => {
    return url.toLowerCase().endsWith(".parquet");
  });
  if (!parquetUrl) {
    throw new Error(
      `No Parquet URL in catalog for dataset '${extractor.dataset.name}'`,
    );
  }
  const response = await fetch(parquetUrl);
  if (!response.ok) {
    throw new Error(
      `Open data Parquet download failed: ${response.statusText}`,
    );
  }
  return {
    datasetId: extractor.dataset.id,
    parquetBlob: await response.blob(),
  };
}

type QetlRunnerOptions = {
  getDiceFromSql: (rawSql: string) => Promise<Dataset.Id[]>;
  getDuckDbLeaseDatasetIds?: (
    queryDependencies: readonly Dataset.Id[],
  ) => Promise<Dataset.Id[]>;
  duckDbReadMode?: "public" | "workspace";
  publicSnapshotDuckDbOwner?: PublicSnapshotDuckDbOwner;
  insertToStorageCache: (
    facts: ReadonlyArray<{ datasetId: Dataset.Id; parquetBlob: Blob }>,
  ) => Promise<void>;
  prepareDuckDbDatasets?: (
    params: Readonly<{
      datasetIds: readonly Dataset.Id[];
      datasetDuckDbLease: DatasetDuckDbLease;
    }>,
  ) => Promise<void>;
};

type DatasetsBySourceType = Record<Dataset.T["sourceType"], Dataset.T[]>;
type DatasetsById = Record<Dataset.Id, Dataset.T | undefined>;

type RunQetlQueryOptions = {
  rawSql: string;
  returnType?: "parquet" | "js";
  datasetDuckDbLease?: DatasetDuckDbLease;
};

type QetlRunQuery = {
  (
    options: Readonly<RunQetlQueryOptions & { returnType: "parquet" }>,
  ): Promise<Blob>;
  <RowObject extends UnknownObject = UnknownRow>(
    options: Readonly<RunQetlQueryOptions & { returnType?: "js" }>,
  ): Promise<QueryResult.T<RowObject>>;
};

type RunLeasedQueryOptions = {
  datasetDuckDbLease: DatasetDuckDbLease;
  queryDependencies: readonly Dataset.Id[];
  rawSql: string;
  returnType: "parquet" | "js";
};

async function _getMissingDice(
  queryDependencies: readonly Dataset.Id[],
): Promise<Dataset.Id[]> {
  if (queryDependencies.length === 0) {
    return [];
  }
  const inMemoryDice = await DuckDbClient.getTableOrViewNames();
  const inMemoryDiceSet = new Set(inMemoryDice);
  return difference(
    queryDependencies,
    queryDependencies.filter((datasetId) => {
      return inMemoryDiceSet.has(datasetId);
    }),
  );
}

async function _getCsvExtractors(
  options: Readonly<{ ids: readonly Dataset.Id[]; datasetsById: DatasetsById }>,
): Promise<DiceExtractor[]> {
  const sources = await CsvFileDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "csv_file",
      sourceDataset,
    };
  });
}

async function _getXlsxExtractors(
  options: Readonly<{ ids: readonly Dataset.Id[]; datasetsById: DatasetsById }>,
): Promise<DiceExtractor[]> {
  const sources = await XlsxFileDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "xlsx_file",
      sourceDataset,
    };
  });
}

async function _getVirtualExtractors(
  options: Readonly<{ ids: readonly Dataset.Id[]; datasetsById: DatasetsById }>,
): Promise<DiceExtractor[]> {
  const sources = await VirtualDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "virtual",
      sourceDataset,
    };
  });
}

async function _getOpenDataExtractors(
  options: Readonly<{ ids: readonly Dataset.Id[]; datasetsById: DatasetsById }>,
): Promise<DiceExtractor[]> {
  const sources = await OpenDataDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "open_data",
      sourceDataset,
    };
  });
}

async function _getExtractorsForSourceType(
  options: Readonly<{
    sourceType: Dataset.T["sourceType"];
    datasetsBySourceType: DatasetsBySourceType;
    datasetsById: DatasetsById;
  }>,
): Promise<DiceExtractor[]> {
  const extractorOptions = {
    ids: options.datasetsBySourceType[options.sourceType].map(prop("id")),
    datasetsById: options.datasetsById,
  };
  return match(options.sourceType)
    .with("csv_file", () => {
      return _getCsvExtractors(extractorOptions);
    })
    .with("xlsx_file", () => {
      return _getXlsxExtractors(extractorOptions);
    })
    .with("virtual", () => {
      return _getVirtualExtractors(extractorOptions);
    })
    .with("open_data", () => {
      return _getOpenDataExtractors(extractorOptions);
    })
    .with("google_sheets", () => {
      throw new Error("Google Sheets extraction is not supported yet");
    })
    .exhaustive();
}

async function _getDiceExtractors(
  dice: readonly Dataset.Id[],
): Promise<DiceExtractor[]> {
  const datasets = await DatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("id", "in", dice));
  const datasetsById = makeIdLookupRecord(datasets);
  const datasetsBySourceType = makeBucketRecord(datasets, {
    key: "sourceType",
  });
  return promiseFlatMap(objectKeys(datasetsBySourceType), (sourceType) => {
    return _getExtractorsForSourceType({
      sourceType,
      datasetsBySourceType,
      datasetsById,
    });
  });
}

type FetchExtractorOptions = {
  extractor: DiceExtractor;
  datasetDuckDbLease: DatasetDuckDbLease;
  runQuery: QetlRunQuery;
};

async function _fetchExtractor(
  options: Readonly<FetchExtractorOptions>,
): Promise<ExtractedFact> {
  const cachedFact = await _getCachedFact(options.extractor);
  if (cachedFact) {
    return cachedFact;
  }
  return match(options.extractor)
    .with({ sourceType: "csv_file" }, _downloadStoredDatasetFact)
    .with({ sourceType: "xlsx_file" }, _downloadStoredDatasetFact)
    .with({ sourceType: "open_data" }, _downloadOpenDataFact)
    .with({ sourceType: "virtual" }, async (extractor) => {
      return {
        datasetId: extractor.dataset.id,
        parquetBlob: await options.runQuery({
          rawSql: extractor.sourceDataset.rawSql,
          returnType: "parquet",
          datasetDuckDbLease: options.datasetDuckDbLease,
        }),
      };
    })
    .with({ sourceType: "google_sheets" }, () => {
      throw new Error("Google Sheets data fetching is not supported yet");
    })
    .exhaustive();
}

async function _fetchData(
  options: Readonly<{
    extractors: readonly DiceExtractor[];
    datasetDuckDbLease: DatasetDuckDbLease;
    runQuery: QetlRunQuery;
  }>,
): Promise<ExtractedFact[]> {
  return options.extractors.reduce<Promise<ExtractedFact[]>>(
    async (priorFactsPromise, extractor) => {
      const priorFacts = await priorFactsPromise;
      const extractedFact = await _fetchExtractor({ ...options, extractor });
      return priorFacts.concat(extractedFact);
    },
    Promise.resolve([]),
  );
}

async function _loadFacts(
  options: Readonly<{
    facts: readonly ExtractedFact[];
    datasetDuckDbLease: DatasetDuckDbLease;
    insertToStorageCache: QetlRunnerOptions["insertToStorageCache"];
  }>,
): Promise<void> {
  const storedFacts = await LocalDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("datasetId", "in", options.facts.map(prop("datasetId"))));
  const factsToCache = options.facts.filter((fact) => {
    return !storedFacts.some(propEq("datasetId", fact.datasetId));
  });
  await options.insertToStorageCache(factsToCache);
  const columns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.facts.map(prop("datasetId"))));
  const columnsByDatasetId = makeBucketRecord(columns, { key: "datasetId" });
  await promiseMap(options.facts, (fact) => {
    return DuckDbClient.loadParquet({
      tableName: fact.datasetId,
      blob: fact.parquetBlob,
      datasetDuckDbLease: options.datasetDuckDbLease,
      columnReplacements: makeIdLookupRecord(
        _getColumnReplacements(columnsByDatasetId[fact.datasetId] ?? []),
        { key: "originalName" },
      ),
    });
  });
}

async function _runLeasedQuery<RowObject extends UnknownObject>(
  options: Readonly<{
    runnerOptions: QetlRunnerOptions;
    queryOptions: RunLeasedQueryOptions;
    runQuery: QetlRunQuery;
  }>,
): Promise<Blob | QueryResult.T<RowObject>> {
  const { runnerOptions, queryOptions } = options;
  await runnerOptions.prepareDuckDbDatasets?.({
    datasetIds: queryOptions.queryDependencies,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
  });
  const missingDice = await _getMissingDice(queryOptions.queryDependencies);
  const extractors = await _getDiceExtractors(missingDice);
  const fetchedFacts = await _fetchData({
    extractors,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    runQuery: options.runQuery,
  });
  await _loadFacts({
    facts: fetchedFacts,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    insertToStorageCache: runnerOptions.insertToStorageCache,
  });
  const duckDbQueryOptions = {
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    datasetTableReadMode: runnerOptions.duckDbReadMode,
    publicSnapshotDuckDbOwner: runnerOptions.publicSnapshotDuckDbOwner,
  };
  return queryOptions.returnType === "parquet" ?
      DuckDbClient.runRawQuery(queryOptions.rawSql, {
        ...duckDbQueryOptions,
        returnType: "parquet",
      })
    : DuckDbClient.runRawQuery<RowObject>(
        queryOptions.rawSql,
        duckDbQueryOptions,
      );
}

async function _runQuery<RowObject extends UnknownObject = UnknownRow>(
  options: Readonly<{
    runnerOptions: QetlRunnerOptions;
    queryOptions: RunQetlQueryOptions;
    runQuery: QetlRunQuery;
  }>,
): Promise<Blob | QueryResult.T<RowObject>> {
  const queryDependencies = await options.runnerOptions.getDiceFromSql(
    options.queryOptions.rawSql,
  );
  const leaseDatasetIds =
    options.queryOptions.datasetDuckDbLease ?
      queryDependencies
    : ((await options.runnerOptions.getDuckDbLeaseDatasetIds?.(
        queryDependencies,
      )) ?? queryDependencies);
  return DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
    datasetIds: leaseDatasetIds,
    lease: options.queryOptions.datasetDuckDbLease,
    operation: (datasetDuckDbLease) => {
      return _runLeasedQuery<RowObject>({
        runnerOptions: options.runnerOptions,
        runQuery: options.runQuery,
        queryOptions: {
          datasetDuckDbLease,
          queryDependencies,
          rawSql: options.queryOptions.rawSql,
          returnType: options.queryOptions.returnType ?? "js",
        },
      });
    },
  });
}

function _createQetlQueryRunner(
  runnerOptions: Readonly<QetlRunnerOptions>,
): QetlRunQuery {
  const runQuery = (queryOptions: Readonly<RunQetlQueryOptions>) => {
    return _runQuery({ runnerOptions, queryOptions, runQuery });
  };
  return runQuery as QetlRunQuery;
}

/**
 * This is the powerhouse of Avandar. It powers our Qetl architecture for
 * on-demand ETL queries.
 *
 * Based heavily on Baldacci et. al. (2017)
 * "Qetl: An approach to on-demand ETL from non-owned data sources."
 *
 * In this implementation, the data cube is a two-layer storage system: there
 * is a local in-memory cube (a DuckDB database) from which data is ultimately
 * queried to generate the output data. We will refer to this as the MemoryCube.
 * There is a layer above this with more local storage capacity, which we will
 * refer to as the "storage cube." IndexedDB is used as the storage cube.
 * The storage cube is not used for querying, but as an on-disk cache to
 * easily load data into the Memory Cube and reduce the number of network
 * requests that must be done.
 *
 * Future work will allow this to be abstracted to any database, so that
 * SQLite WASM can be used for transactional Qetl.
 *
 * TODO(jpsyx): this is **far** from a real Qetl implementation. Currently
 * it only operates on full datasets rather than doing any filtering of data,
 * dice management, fact loading, or any other optimizations.
 */
export const QetlClientFactory = createModuleFactory<IQetlClient>(
  "QetlClient",
  {
    childBuilder: (module) => {
      return { runQuery: _createQetlQueryRunner(module.getState()) };
    },
  },
);
