import { createModuleFactory } from "@avandar/modules";
import { createQetlQueryRunner } from "@/clients/qetl/QetlClient/qetlQueryRunner";
import type {
  DatasetDuckDbLease,
  PublicSnapshotDuckDbOwner,
} from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Module } from "@avandar/modules";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
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
        signal?: AbortSignal;
      }): Promise<QueryResult.T<RowObject>>;
      (params: {
        rawSql: string;
        returnType: "parquet";
        signal?: AbortSignal;
      }): Promise<Blob>;
    };
  }
>;

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
      return { runQuery: createQetlQueryRunner(module.getState()) };
    },
  },
);
