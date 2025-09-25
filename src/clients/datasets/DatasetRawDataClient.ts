import { invariant } from "@tanstack/react-router";
import { match } from "ts-pattern";
import { BaseClient, createBaseClient } from "@/lib/clients/BaseClient";
import { WithLogger, withLogger } from "@/lib/clients/withLogger";
import {
  WithQueryHooks,
  withQueryHooks,
} from "@/lib/clients/withQueryHooks/withQueryHooks";
import { ILogger } from "@/lib/Logger";
import { UnknownDataFrame } from "@/lib/types/common";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { where } from "@/lib/utils/filters/filterBuilders";
import { getProp, propIs } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseMap } from "@/lib/utils/promises";
import { DatasetId } from "@/models/datasets/Dataset";
import {
  ColumnSummary,
  DatasetSummary,
} from "@/models/datasets/DatasetRawData/getSummary";
import { DuckDBClient, UnknownRow } from "../DuckDBClient";
import { DuckDBDataType } from "../DuckDBClient/DuckDBDataType";
import { scalar, singleton } from "../DuckDBClient/queryResultHelpers";
import {
  QueryResultData,
  StructuredDuckDBQueryConfig,
} from "../DuckDBClient/types";
import { LocalDatasetEntryClient } from "./LocalDatasetEntryClient";

type DatasetLocalRawQueryOptions = {
  /**
   * The local DuckDB query to run. Any parameter tokens inside the query
   * can be specified using `$paramName$` syntax in the string.
   */
  query: string;

  /** Parameters to pass into the query */
  queryArgs?: Record<string, string | number | bigint>;

  /**
   * A list of datasets that this query depends on.
   * These datasets must be loaded locally. Any missing datasets will
   * be loaded locally before the query is executed, if possible.
   */
  dependencies: DatasetId[];
};

type DatasetLocalStructuredQueryOptions = {
  /**
   * The structured DuckDB query to run locally.
   */
  query: Omit<StructuredDuckDBQueryConfig, "tableName"> & {
    datasetId: DatasetId;
  };
};

type DatasetRawDataClientQueries = {
  /**
   * Runs a raw DuckDB query against the user's locally loaded raw data.
   * If the datasets specified in `dependencies` have not been loaded locally
   * yet, then this will throw an error.
   *
   * TODO(jpsyx): instead of throwing an error, we should make our best attempt
   * to load the dataset if possible.
   *
   * @param params The {@link DatasetLocalRawQueryOptions} object.
   * @param params.query The SQL query to run. Any parameter tokens inside the
   * query can be specified using `$paramName$` syntax in the string.
   * @param params.params Parameters to pass into the query
   * @param params.dependencies Optional list of dataset IDs that this query
   * depends on. These datasets will be loaded locally before the query is
   * executed.
   * @returns An array of rows
   */
  runLocalRawQuery: <T extends UnknownRow = UnknownRow>(
    params: DatasetLocalRawQueryOptions,
  ) => Promise<QueryResultData<T>>;

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
   * @param params The {@link StructuredDuckDBQueryConfig} object to run
   * @param params.query The query to run, structured as a
   * {@link StructuredDuckDBQueryConfig} object, except with the `tableName`
   * replaced by a `datasetId` field.
   * @returns An array of rows
   */
  runLocalStructuredQuery: <T extends UnknownRow = UnknownRow>(
    params: DatasetLocalStructuredQueryOptions,
  ) => Promise<QueryResultData<T>>;

  getSummary: (params: { datasetId: DatasetId }) => Promise<DatasetSummary>;

  /**
   * Gets a preview of the dataset's locally loaded raw data.
   * If the dataset has not been loaded locally already (i.e. if it does not
   * have an entry in LocalDatasetEntryClient that maps to a local DuckDB
   * table), then this will throw an error.
   */
  getPreviewData: (params: {
    datasetId: DatasetId;
    numRows: number;
  }) => Promise<UnknownDataFrame>;
};

export type IDatasetRawDataClient = BaseClient & DatasetRawDataClientQueries;

/**
 * Creates a client to query a dataset's raw data.
 *
 * This client is not a CRUD client, so it does not support CRUD functions.
 */
function createDatasetRawDataClient(): WithLogger<
  WithQueryHooks<
    IDatasetRawDataClient,
    keyof DatasetRawDataClientQueries,
    never
  >
> {
  const baseClient = createBaseClient("DatasetRawData");

  const helpers = {
    async loadDatasetsLocally(datasetIds: DatasetId[]): Promise<void> {
      if (datasetIds.length === 0) {
        return;
      }

      const localDatasetEntries = await LocalDatasetEntryClient.getAll(
        where("datasetId", "in", datasetIds),
      );
      const datasetLoadStatus = await promiseMap(
        localDatasetEntries,
        async (entry) => {
          const isDataLoaded = await DuckDBClient.hasTable(
            entry.localTableName,
          );
          return {
            datasetId: entry.datasetId,
            localTableName: entry.localTableName,
            isLoaded: isDataLoaded,
          };
        },
      );

      // check if a dataset is not loaded
      if (datasetLoadStatus.some(propIs("isLoaded", false))) {
        const datasetIdsNotLoaded = datasetLoadStatus
          .filter(propIs("isLoaded", false))
          .map(getProp("datasetId"))
          .join(", ");

        // TODO(jpsyx): we should not throw an error here by default.
        // Instead, the dataset should get loaded **if possible**.
        // CSV files that cannot be downloaded (if they were never synced
        // to the cloud) cannot be loaded, so in that case we throw
        // an error.
        throw new Error(
          `The following datasets could not be loaded: ${datasetIdsNotLoaded}`,
        );
      }
    },
  };

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries: DatasetRawDataClientQueries = {
      runLocalRawQuery: async <T extends UnknownRow = UnknownRow>(
        params: DatasetLocalRawQueryOptions,
      ) => {
        const logger = baseLogger.appendName("runLocalRawQuery");
        logger.log("Running raw query", params);
        const { query, dependencies, queryArgs = {} } = params;

        await helpers.loadDatasetsLocally(dependencies);

        // run the query - at this point we can be confident that all dependent
        // datasets are loaded
        return DuckDBClient.runRawQuery<T>(query, queryArgs);
      },

      runLocalStructuredQuery: async <T extends UnknownRow = UnknownRow>(
        params: DatasetLocalStructuredQueryOptions,
      ): Promise<QueryResultData<T>> => {
        const logger = baseLogger.appendName("runLocalStructuredQuery");
        logger.log("Running structured query", params);
        const {
          query: { datasetId, ...queryParams },
        } = params;

        await helpers.loadDatasetsLocally([datasetId]);

        const datasetEntry = await LocalDatasetEntryClient.getById({
          id: datasetId,
        });

        if (!datasetEntry) {
          throw new Error(`Dataset ${datasetId} not found`);
        }

        return await DuckDBClient.runStructuredQuery<T>({
          ...queryParams,
          tableName: datasetEntry.localTableName,
        });
      },

      getPreviewData: async (params: {
        datasetId: DatasetId;
        numRows: number;
      }) => {
        const logger = baseLogger.appendName("getPreviewData");
        logger.log("Getting preview data for dataset", params);
        const { datasetId, numRows } = params;

        // we have to get the local table name for the given dataset
        const datasetEntry = await LocalDatasetEntryClient.getById({
          id: datasetId,
        });

        if (datasetEntry) {
          const tableName = datasetEntry?.localTableName;
          const { data } = await DuckDBClient.runRawQuery(
            `SELECT * FROM "${tableName}" LIMIT ${numRows}`,
            { tableName },
          );
          return data;
        }

        throw new Error(
          `Could not find a local entry for dataset ${datasetId}`,
        );
      },

      getSummary: async (params: {
        datasetId: DatasetId;
      }): Promise<DatasetSummary> => {
        const logger = baseLogger.appendName("getSummary");
        logger.log("Calling `getSummary`", params);

        const loadedDatasetEntry = await LocalDatasetEntryClient.getById({
          id: params.datasetId,
        });

        invariant(
          loadedDatasetEntry,
          `Could not find a locally loaded entry for dataset ${params.datasetId}`,
        );

        const { localTableName } = loadedDatasetEntry;

        const duckdbColumns = await DuckDBClient.getTableSchema(localTableName);
        const columns = duckdbColumns.map((duckColumn, idx) => {
          return {
            name: duckColumn.column_name,
            dataType: DuckDBDataType.toDatasetDataType(duckColumn.column_type),
            columnIdx: idx,
          };
        });

        const numRows = Number(
          scalar(
            await DuckDBClient.runRawQuery<{
              count: bigint;
            }>(`SELECT COUNT(*) as count FROM "$tableName$"`, {
              tableName: localTableName,
            }),
          ),
        );

        const columnSummaries = await promiseMap(
          columns,
          async (column): Promise<ColumnSummary> => {
            const { name: columnName, dataType } = column;

            const distinctValuesCount = Number(
              scalar(
                await DuckDBClient.runRawQuery<{
                  count: bigint;
                }>(
                  `SELECT COUNT(DISTINCT "$columnName$") as count FROM "$tableName$"`,
                  { columnName: columnName, tableName: localTableName },
                ),
              ),
            );

            const emptyValuesCount = Number(
              scalar(
                await DuckDBClient.runRawQuery<{
                  count: bigint;
                }>(
                  `SELECT COUNT("$columnName$") as count
                    FROM "$tableName$"
                    WHERE "$columnName$" IS NULL
                    ${dataType === "text" ? `OR "$columnName$" = ''` : ""}
                  `,
                  { columnName, tableName: localTableName },
                ),
              ),
            );

            // Find the maximum count for the most common value(s)
            const maxCountResult = await DuckDBClient.runRawQuery<{
              max_count: bigint;
            }>(
              `SELECT MAX(cnt) as max_count FROM (
                SELECT COUNT(*) as cnt
                FROM "$tableName$"
                WHERE
                  "$columnName$" IS NOT NULL
                  ${dataType === "text" ? `AND "$columnName$" <> ''` : ""}
                GROUP BY "${columnName}"
              )`,
              { columnName, tableName: localTableName },
            );
            const maxCount = maxCountResult.data[0]?.max_count ?? 0n;

            // Get all values with the maximum count
            const mostCommonValuesQuery = await DuckDBClient.runRawQuery<{
              value: unknown;
              count: bigint;
            }>(
              `SELECT "$columnName$" AS value, COUNT(*) AS count
               FROM "$tableName$"
               WHERE
                 "$columnName$" IS NOT NULL
                 ${dataType === "text" ? `AND "$columnName$" <> ''` : ""}
               GROUP BY "$columnName$"
               HAVING COUNT(*) = $maxCount$
               ORDER BY value
               LIMIT 10`, // only get the top 10 to save memory
              {
                columnName,
                tableName: localTableName,
                maxCount,
              },
            );
            const mostCommonValue = mostCommonValuesQuery.data;

            const typeSpecificSummary = await match(dataType)
              .with("text", () => {
                return {
                  type: "text" as const,
                };
              })
              .with("number", async () => {
                // TODO(jpsyx): implement this
                const {
                  max = NaN,
                  min = NaN,
                  avg = NaN,
                  stdDev = NaN,
                } = singleton(
                  await DuckDBClient.runRawQuery<{
                    max: number;
                    min: number;
                    avg: number;
                    stdDev: number;
                  }>(
                    `SELECT
                        MAX("$columnName$") as max,
                        MIN("$columnName$") as min,
                        AVG("$columnName$") as avg,
                        STDDEV_SAMP("$columnName$") as stdDev
                      FROM "$tableName$"`,
                    { columnName, tableName: localTableName },
                  ),
                ) ?? {};
                return {
                  type: "number" as const,
                  maxValue: max,
                  minValue: min,
                  averageValue: avg,
                  stdDev: stdDev,
                };
              })
              .with("date", () => {
                notifyDevAlert("Date field summary not implemented");
                // TODO(jpsyx): implement this
                return {
                  type: "date" as const,
                  mostRecentDate: "",
                  oldestDate: "",
                  datasetDuration: "",
                };
              })
              .exhaustive();

            return {
              name: columnName,
              distinctValuesCount,
              emptyValuesCount,
              percentMissingValues: emptyValuesCount / distinctValuesCount,
              mostCommonValue:
                !mostCommonValue || mostCommonValue.length === 0 ?
                  {
                    count: 0,
                    value: [],
                  }
                : {
                    count: Number(maxCount),
                    value: mostCommonValue.map((row) => {
                      return String(row.value);
                    }),
                  },
              ...typeSpecificSummary,
            };
          },
        );

        return {
          rows: numRows,
          columns: columns.length,
          columnSummaries,
        };
      },
    };

    return withQueryHooks(
      { ...baseClient, ...queries },
      {
        queryFns: objectKeys(queries),
        mutationFns: [],
      },
    );
  });
}

/**
 * A client to query a dataset's raw data.
 *
 * This client should be the only way we ever query a dataset's contents.
 * DuckDB and any external APIs should never be used directly by any components.
 * All dataset data should be queried through this client, which will handle
 * loading any necessary data locally, running external queries (and making sure
 * we query only exactly what is needed), caching results, etc.
 *
 * This client uses the Facade software pattern. It provides a single interface
 * that our components can use to query for dataset data. Internally, this
 * client will then query the necessary sub-systems (e.g. DuckDB, external APIs)
 * to extract and transform the required data.
 */
export const DatasetRawDataClient = createDatasetRawDataClient();
