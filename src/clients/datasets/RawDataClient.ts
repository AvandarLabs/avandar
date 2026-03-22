import { createServiceClient } from "@clients/ServiceClient/createServiceClient";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
import { withLogger } from "@logger/module-augmenters/withLogger";
import { objectKeys } from "@utils/objects/objectKeys";
import { DuckDBClient } from "../DuckDBClient";
import type { UnknownRow } from "../DuckDBClient";
import type { DuckDBStructuredQuery } from "../DuckDBClient/DuckDBClient.types";
import type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types";
import type { WithQueryHooks } from "@hooks/withQueryHooks/withQueryHooks.types";
import type { ILogger, WithLogger } from "@logger/Logger.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";

type DatasetLocalStructuredQueryOptions = {
  /**
   * The structured DuckDB query to run locally.
   */
  query: Omit<DuckDBStructuredQuery, "tableName"> & {
    datasetId: DatasetId;
  };
};

type RawDataClientQueries = {
  /**
   * Runs a structured query against the user's locally loaded raw data.
   * If the dataset has not been loaded locally yet, then this will throw
   * an error.
   *
   * TODO(jpsyx): instead of throwing an error, we should make our best attempt
   * to load the dataset if possible.
   *
   * TODO(jpsyx): have this support a "where" clause which we can pass to DuckDB
   *   Until we can support "where", we will need to continue
   *   using runLocalRawQuery
   *
   * @param params The {@link DuckDBStructuredQuery} object to run
   * @param params.query The query to run, structured as a
   * {@link DuckDBStructuredQuery} object, except with the `tableName`
   * replaced by a `datasetId` field.
   * @returns An array of rows
   *
   * TODO(jpsyx): this is the only reason we can't fully delete this module yet.
   * We need to find a way to convert structured queries to raw SQL queries and
   * then call the WorkspaceQETLClient instead.
   */
  runLocalStructuredQuery: <T extends UnknownRow = UnknownRow>(
    params: DatasetLocalStructuredQueryOptions,
  ) => Promise<QueryResult<T>>;
};

export type IDatasetRawDataClient = ServiceClient & RawDataClientQueries;

/**
 * Creates a client to query a dataset's raw data.
 *
 * This client is not a CRUD client, so it does not support CRUD functions.
 */
function createRawDataClient(): WithLogger<
  WithQueryHooks<IDatasetRawDataClient, keyof RawDataClientQueries, never>
> {
  const baseClient = createServiceClient("RawDataClient");

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries: RawDataClientQueries = {
      runLocalStructuredQuery: async <T extends UnknownRow = UnknownRow>(
        params: DatasetLocalStructuredQueryOptions,
      ): Promise<QueryResult<T>> => {
        const logger = baseLogger.appendName("runLocalStructuredQuery");
        logger.log("Running structured query", params);
        const {
          query: { datasetId, ...queryParams },
        } = params;
        return await DuckDBClient.runStructuredQuery<T>({
          ...queryParams,
          tableName: datasetId,
        });
      },
    };

    return withQueryHooks(
      { ...baseClient, ...queries },
      {
        queryFns: objectKeys(queries),
      },
    );
  });
}

// TODO(jpsyx): eventually all RawDataClient should be moved to QETLClient.
/**
 * A client to manage the raw data of datasets.
 *
 * This client should be the only way we ever query a dataset's contents.
 * DuckDB and any external APIs should never be used directly by any components.
 * All dataset data should be queried through this client.
 *
 * This client handles running external queries, caching results, and loading
 * all necessary data locally. Queries are finally run against local data in
 * DuckDB.
 *
 * For now, since we do not support any external data sources, this client is
 * only interacting with local data, fetching data from our Supabase buckets,
 * and querying with DuckDB. We also do not handle any caching or any other
 * performance optimizations yet.
 *
 * This client uses the Facade software pattern. It provides a single interface
 * that our components can use to query for dataset data. Internally, this
 * client will then query the necessary sub-systems (e.g. DuckDB, external APIs)
 * to extract and transform the required data.
 *
 * @deprecated This client is deprecated. We should use the
 * {@link WorkspaceQETLClient} instead.
 */
export const RawDataClient = createRawDataClient();
