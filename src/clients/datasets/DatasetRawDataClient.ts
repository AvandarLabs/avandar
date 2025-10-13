import { match } from "ts-pattern";
import { BaseClient, createBaseClient } from "@/lib/clients/BaseClient";
import { WithLogger, withLogger } from "@/lib/clients/withLogger";
import {
  WithQueryHooks,
  withQueryHooks,
} from "@/lib/clients/withQueryHooks/withQueryHooks";
import { ILogger, Logger } from "@/lib/Logger";
import { UnknownDataFrame } from "@/lib/types/common";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { difference, partition } from "@/lib/utils/arrays/misc";
import { where } from "@/lib/utils/filters/filterBuilders";
import { getProp, propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseMap, promiseReduce } from "@/lib/utils/promises";
import { DatasetId } from "@/models/datasets/Dataset";
import {
  ColumnSummary,
  DatasetSummary,
} from "@/models/datasets/DatasetRawData/getSummary";
import { DuckDBClient, UnknownRow } from "../DuckDBClient";
import { DuckDBDataTypeUtils } from "../DuckDBClient/DuckDBDataType";
import { scalar, singleton } from "../DuckDBClient/queryResultHelpers";
import {
  QueryResultData,
  StructuredDuckDBQueryConfig,
} from "../DuckDBClient/types";
import { LocalDatasetClient } from "./LocalDatasetClient";

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
   * Checks if a dataset is available locally.
   *
   * @param params The {@link DatasetId} to check.
   * @returns `true` if the dataset is loaded locally, `false` otherwise.
   */
  isLocalDatasetAvailable: (params: {
    datasetId: DatasetId;
  }) => Promise<boolean>;

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

  /**
   * Loads the given datasets to an in-memory DuckDB instance.
   * TODO(jpsyx): this should be a function in LocalDatasetClient.
   * @param datasetIds The IDs of the datasets to load into memory.
   */
  const _loadDatasetsToMemory = async (
    datasetIds: DatasetId[],
  ): Promise<void> => {
    if (datasetIds.length === 0) {
      return;
    }
    const localDatasets = await LocalDatasetClient.getAll(
      where("datasetId", "in", datasetIds),
    );

    const missingLocalDatasets = difference(
      datasetIds,
      localDatasets.map(getProp("datasetId")),
    );
    if (missingLocalDatasets.length > 0) {
      throw new Error(
        `The following datasets were not found locally: ${missingLocalDatasets.join(", ")}`,
      );
    }
    const datasetLoadStatuses = await promiseMap(
      localDatasets,
      async ({ datasetId, parquetData: rawData }) => {
        const isAlreadyInMemory = await DuckDBClient.hasTable(datasetId);
        if (!isAlreadyInMemory) {
          await DuckDBClient.loadParquet({
            tableName: datasetId,
            blob: rawData,
          });
        }
        return { datasetId, skipped: isAlreadyInMemory };
      },
    );
    const [skippedDatasets, newlyLoadedDatasets] = partition(
      datasetLoadStatuses,
      propEq("skipped", true),
    );
    if (skippedDatasets.length > 0) {
      Logger.log(
        "The following datasets were already in memory",
        skippedDatasets.map(getProp("datasetId")),
      );
    }
    if (newlyLoadedDatasets.length > 0) {
      Logger.log(
        "The following datasets were loaded to memory",
        newlyLoadedDatasets.map(getProp("datasetId")),
      );
    }
  };

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries: DatasetRawDataClientQueries = {
      isLocalDatasetAvailable: async (params: { datasetId: DatasetId }) => {
        const { datasetId } = params;
        const localDataset = await LocalDatasetClient.getById({
          id: datasetId,
        });
        return !!localDataset;
      },

      runLocalRawQuery: async <T extends UnknownRow = UnknownRow>(
        params: DatasetLocalRawQueryOptions,
      ) => {
        const logger = baseLogger.appendName("runLocalRawQuery");
        logger.log("Running raw query", params);
        const { query, dependencies, queryArgs = {} } = params;
        await _loadDatasetsToMemory(dependencies);

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
        await _loadDatasetsToMemory([datasetId]);
        return await DuckDBClient.runStructuredQuery<T>({
          ...queryParams,
          tableName: datasetId,
        });
      },

      getPreviewData: async (params: {
        datasetId: DatasetId;
        numRows: number;
      }) => {
        const logger = baseLogger.appendName("getPreviewData");
        logger.log("Getting preview data for dataset", params);
        const { datasetId, numRows } = params;
        await _loadDatasetsToMemory([datasetId]);

        const { data } = await DuckDBClient.runRawQuery(
          'SELECT * FROM "$tableName$" LIMIT $numRows$',
          { params: { numRows, tableName: datasetId } },
        );
        return data;
      },

      getSummary: async (params: {
        datasetId: DatasetId;
      }): Promise<DatasetSummary> => {
        const logger = baseLogger.appendName("getSummary");
        logger.log("Calling `getSummary`", params);
        const { datasetId } = params;
        await _loadDatasetsToMemory([datasetId]);
        const duckdbColumns = await DuckDBClient.getTableSchema(datasetId);
        const columns = duckdbColumns.map((duckColumn, idx) => {
          return {
            name: duckColumn.column_name,
            dataType: DuckDBDataTypeUtils.toDatasetColumnDataType(
              duckColumn.column_type,
            ),
            columnIdx: idx,
          };
        });
        const numRows = Number(
          scalar(
            await DuckDBClient.runRawQuery<{
              count: bigint;
            }>(`SELECT COUNT(*) as count FROM "$tableName$"`, {
              params: { tableName: datasetId },
            }),
          ),
        );

        const columnSummaries: ColumnSummary[] = await promiseReduce(
          columns,
          async (summaries, column): Promise<ColumnSummary[]> => {
            const { name: columnName, dataType } = column;

            const distinctValuesCount = Number(
              scalar(
                await DuckDBClient.runRawQuery<{
                  count: bigint;
                }>(
                  `SELECT COUNT(DISTINCT "$columnName$") as count FROM "$tableName$"`,
                  {
                    params: {
                      columnName: columnName,
                      tableName: datasetId,
                    },
                  },
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
                  { params: { columnName, tableName: datasetId } },
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
              { params: { columnName, tableName: datasetId } },
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
                params: {
                  columnName,
                  tableName: datasetId,
                  maxCount,
                },
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
                    { params: { columnName, tableName: datasetId } },
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

            const summary: ColumnSummary = {
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

            summaries.push(summary);
            return summaries;
          },
          [],
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
