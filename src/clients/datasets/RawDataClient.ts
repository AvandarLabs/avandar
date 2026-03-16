import { createServiceClient } from "@clients/ServiceClient/createServiceClient";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
import { withLogger } from "@logger/module-augmenters/withLogger";
import { notifyDevAlert } from "@ui/notifications/notifyDevAlert";
import { where } from "@utils/filters/where/where";
import { isDefined } from "@utils/guards/isDefined/isDefined";
import { prop } from "@utils/objects/hofs/prop/prop";
import { propEq } from "@utils/objects/hofs/propEq/propEq";
import { objectKeys } from "@utils/objects/objectKeys";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.types";
import { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import { match } from "ts-pattern";
import { AuthClient } from "@/clients/AuthClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { difference } from "@/lib/utils/arrays/difference/difference";
import { partition } from "@/lib/utils/arrays/partition/partition";
import { promiseMap, promiseReduce } from "@/lib/utils/promises";
import { Logger } from "@/utils/Logger";
import { DuckDBClient } from "../DuckDBClient";
import { DuckDBDataTypeUtils } from "../DuckDBClient/DuckDBDataType";
import { scalar, singleton } from "../DuckDBClient/queryResultHelpers";
import { DatasetParquetStorageClient } from "../storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { CSVFileDatasetClient } from "./CSVFileDatasetClient";
import { DatasetColumnClient } from "./DatasetColumnClient";
import { LocalDatasetClient } from "./LocalDatasetClient";
import type { UnknownRow } from "../DuckDBClient";
import type { DuckDBStructuredQuery } from "../DuckDBClient/DuckDBClient.types";
import type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types";
import type { WithQueryHooks } from "@hooks/withQueryHooks/withQueryHooks.types";
import type { ILogger, WithLogger } from "@logger/Logger.types";
import type { UnknownDataFrame } from "@utils/types/common";
import type {
  DatasetId,
  DatasetSourceType,
} from "$/models/datasets/Dataset/Dataset.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";
import type { UserId } from "$/models/User/User.types";

type TextFieldSummary = {
  type: "text";
};

type NumericFieldSummary = {
  type: "number";
  maxValue: number;
  minValue: number;
  averageValue: number;
  stdDev: number;
};

type DateFieldSummary = {
  type: "date";
  mostRecentDate: string;
  oldestDate: string;
  datasetCoverage: string;
};

export type ColumnSummary = {
  name: string;
  distinctValuesCount: number;
  emptyValuesCount: number;
  percentMissingValues: number;
  mostCommonValue: {
    count: number;
    value: string[];
  };
} & (TextFieldSummary | NumericFieldSummary | DateFieldSummary);

type DatasetSummary = {
  rows: number;
  columns: number;
  columnSummaries?: readonly ColumnSummary[];
};

type DatasetLocalRawQueryOptions = {
  /**
   * The local DuckDB query to run. Any parameter tokens inside the query
   * can be specified using `$paramName$` syntax in the string.
   */
  query: string;

  /** Parameters to pass into the query */
  queryArgs?: Record<string, string | number | bigint | undefined>;

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
  query: Omit<DuckDBStructuredQuery, "tableName"> & {
    datasetId: DatasetId;
  };
};

type RawDataClientQueries = {
  /**
   * Checks if a dataset is available locally. A dataset being "available"
   * locally means that its raw data is persisted on disk (in IndexedDB,
   * accessible with the LocalDatasetClient).
   *
   * This function does not tell us if the data is in-memory, in DuckDB. But
   * if it is in local disk then we know it can be loaded into memory when
   * needed.
   *
   * @param params The {@link DatasetId} to check.
   * @returns `true` if the dataset is loaded locally, `false` otherwise.
   */
  isLocalDatasetAvailable: (params: {
    datasetId: DatasetId;
  }) => Promise<boolean>;

  /**
   * Loads a dataset into memory (DuckDB). This will fetch the dataset from
   * cloud storage if necessary. If the dataset is already in memory,
   * this is a no-op.
   *
   * This is our go-to function to make sure a dataset is available in-memory
   * in DuckDB.
   *
   * @param params The {@link DatasetId} to load.
   */
  loadLocalDataset: (params: { datasetId: DatasetId }) => Promise<void>;

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
   * @param params.queryArgs Parameters to pass into the query. Undefined values
   * will be ignored.
   * @param params.dependencies Optional list of dataset IDs that this query
   * depends on. These datasets will be loaded locally before the query is
   * executed.
   * @returns An array of rows
   */
  runLocalRawQuery: <T extends UnknownRow = UnknownRow>(
    params: DatasetLocalRawQueryOptions,
  ) => Promise<QueryResult<T>>;

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
   */
  runLocalStructuredQuery: <T extends UnknownRow = UnknownRow>(
    params: DatasetLocalStructuredQueryOptions,
  ) => Promise<QueryResult<T>>;

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

type RawDataClientMutations = {
  /**
   * Updates the raw column's metadata. The only supported changes are renaming
   * a column or casting its data type.
   *
   * 1. Fetch and load the data into memory if necessary.
   * 2. Apply the transformations to the data in memory using DuckDB.
   * 3. Store the updated raw data back to local storage as a Parquet blob.
   * 4. Sync the data back to cloud storage (if necessary and allowed, only
   *    for manually-uploaded datasets where we manage the actual source file).
   * 5. If everything succeeds, we write the updated column metadata to the
   *    database.
   *
   * @param params.columnId The {@link DatasetColumnId} of the column to
   * update.
   * @param params.datasetId The {@link DatasetId} of the dataset the column
   * belongs to.
   * @param params.sourceType The {@link DatasetSourceType} of the dataset.
   * @param params.prevColumnName The previous name of the column.
   * @param params.newColumnName The new name of the column.
   * @param params.newDataType The new data type of the column.
   * @returns An object containing the `newDataType` and `newColumnName`, or
   * undefined for any of those values that were not changed.
   */
  updateRawColumnMetadata: (params: {
    columnId: DatasetColumnId;
    datasetId: DatasetId;
    sourceType: DatasetSourceType;
    prevColumnName: string;
    newColumnName?: string;
    newDataType?: AvaDataType;
  }) => Promise<{ newDataType?: AvaDataType; newColumnName?: string }>;
};

export type IDatasetRawDataClient = ServiceClient &
  RawDataClientQueries &
  RawDataClientMutations;

/**
 * Creates a client to query a dataset's raw data.
 *
 * This client is not a CRUD client, so it does not support CRUD functions.
 */
function createRawDataClient(): WithLogger<
  WithQueryHooks<
    IDatasetRawDataClient,
    keyof RawDataClientQueries,
    keyof RawDataClientMutations
  >
> {
  const baseClient = createServiceClient("RawDataClient");

  /**
   * Loads the given datasets to an in-memory DuckDB instance.
   * This will fetch datasets from cloud storage if they are not in local
   * storage.
   * TODO(jpsyx): this should be a function in LocalDatasetClient.
   * @param datasetIds The IDs of the datasets to load into memory.
   */
  const _loadDatasetsToMemory = async (
    datasetIds: DatasetId[],
  ): Promise<void> => {
    if (datasetIds.length === 0) {
      return;
    }
    let localDatasets = await LocalDatasetClient.getAll(
      where("datasetId", "in", datasetIds),
    );

    const missingLocalDatasets = difference(
      datasetIds,
      localDatasets.map(prop("datasetId")),
    );
    if (missingLocalDatasets.length > 0) {
      const session = await AuthClient.getCurrentSession();
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error(
          "Missing datasets could not be downloaded because user is not " +
            "authenticated.",
        );
      }

      const missingDatasetMeta = await DatasetClient.getAll(
        where("id", "in", missingLocalDatasets),
      );

      await promiseMap(missingDatasetMeta, async (dataset) => {
        try {
          await LocalDatasetClient.fetchCloudDatasetToLocalStorage({
            datasetId: dataset.id,
            workspaceId: dataset.workspaceId,
            userId: userId as UserId,
          });
        } catch {
          // ignored - we re-check what is still missing below
        }
      });

      const localDatasetsAfterFetch = await LocalDatasetClient.getAll(
        where("datasetId", "in", datasetIds),
      );
      localDatasets = localDatasetsAfterFetch;
      const stillMissingLocalDatasets = difference(
        datasetIds,
        localDatasetsAfterFetch.map(prop("datasetId")),
      );

      if (stillMissingLocalDatasets.length > 0) {
        throw new Error(
          `The following datasets were not found locally: ` +
            `${stillMissingLocalDatasets.join(", ")}`,
        );
      }
    }
    const datasetLoadStatuses = await promiseMap(
      localDatasets,
      async ({ datasetId, parquetData: rawData }) => {
        const isAlreadyInMemory = await DuckDBClient.hasTableOrView(datasetId);
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
        skippedDatasets.map(prop("datasetId")),
      );
    }
    if (newlyLoadedDatasets.length > 0) {
      Logger.log(
        "The following datasets were loaded to memory",
        newlyLoadedDatasets.map(prop("datasetId")),
      );
    }
  };

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const mutations: RawDataClientMutations = {
      updateRawColumnMetadata: async ({
        columnId,
        datasetId,
        sourceType,
        prevColumnName,
        newColumnName,
        newDataType,
      }: {
        columnId: DatasetColumnId;
        datasetId: DatasetId;
        sourceType: DatasetSourceType;
        prevColumnName: string;
        newColumnName?: string;
        newDataType?: AvaDataType;
      }): Promise<{ newDataType?: AvaDataType; newColumnName?: string }> => {
        if (newColumnName === undefined && newDataType === undefined) {
          // no changes to make
          return { newDataType: undefined, newColumnName: undefined };
        }

        // Ensure dataset is loaded (creates view over parquet)
        await RawDataClient.loadLocalDataset({
          datasetId,
        });

        const tempTableName = `${datasetId}_temp`;

        try {
          // 1. Materialize view to table (views are read-only; need table to
          // alter) and then alter the materialized table (type cast and/or
          // rename) in a single transaction
          const alterStatements: string[] = [
            newDataType !== undefined ?
              'ALTER TABLE "$tempTableName$" ALTER COLUMN "$columnName$" ' +
              'TYPE $newDataType$ USING cast("$columnName$" AS $newDataType$)'
            : undefined,
            newColumnName !== undefined ?
              'ALTER TABLE "$tempTableName$" RENAME COLUMN "$columnName$" ' +
              'TO "$newColumnName$"'
            : undefined,
          ].filter(isDefined);
          const alterTransaction =
            alterStatements.length > 0 ?
              `BEGIN;
CREATE TABLE "$tempTableName$" AS SELECT * FROM "$datasetId$";
${alterStatements.join("; ")};
COMMIT;`
            : undefined;
          if (alterTransaction) {
            await RawDataClient.runLocalRawQuery({
              query: alterTransaction,
              dependencies: [datasetId],
              queryArgs: {
                datasetId,
                tempTableName,
                columnName: prevColumnName,
                newColumnName: newColumnName,
                newDataType:
                  newDataType ?
                    DuckDBDataTypeUtils.fromDatasetColumnType(newDataType)
                  : undefined,
              },
            });
          }

          // 2. Drop the old view and parquet file from DuckDB's buffer
          await DuckDBClient.dropTableViewAndFile(datasetId);

          // 3. Export the altered table to a parquet blob
          const newParquetBlob =
            await DuckDBClient.exportTableAsParquet(tempTableName);

          // 4. Persist the updated parquet to local storage (IndexedDB)
          await LocalDatasetClient.update({
            id: datasetId,
            data: {
              parquetData: newParquetBlob,
            },
          });

          // 5. Drop the temp materialized table
          await DuckDBClient.runRawQuery(
            `DROP TABLE IF EXISTS "$tempTableName$"`,
            { params: { tempTableName } },
          );

          // 6. determine if we need to sync to cloud storage. If yes, sync it.
          if (sourceType === "csv_file") {
            const csvFileDataset = await CSVFileDatasetClient.getOne(
              where("dataset_id", "eq", datasetId),
            );
            if (csvFileDataset?.isInCloudStorage) {
              // sync it!
              await DatasetParquetStorageClient.startDatasetUpload({
                workspaceId: csvFileDataset.workspaceId,
                datasetId,
              });
            }
          }

          // 7. Now update the column metadata in the database
          await DatasetColumnClient.update({
            id: columnId,
            data: {
              dataType: newDataType,
              name: newColumnName,
            },
          });
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes("Conversion Error")) {
              const errMatch = error.message.match(/.*: (.+?)\s+LINE/);
              const shortMsg = errMatch?.[1]?.trim() ?? "Unknown error";
              throw new Error(
                `Failed to change the column data type. ${shortMsg}`,
                { cause: error },
              );
            }
          }
          throw error;
        }

        return {
          newDataType,
          newColumnName,
        };
      },
    };

    const queries: RawDataClientQueries = {
      isLocalDatasetAvailable: async (params: { datasetId: DatasetId }) => {
        const { datasetId } = params;
        const localDataset = await LocalDatasetClient.getById({
          id: datasetId,
        });
        return !!localDataset;
      },

      loadLocalDataset: async (params: { datasetId: DatasetId }) => {
        const logger = baseLogger.appendName("loadLocalDataset");
        logger.log("Loading dataset to memory", params);
        const { datasetId } = params;
        await _loadDatasetsToMemory([datasetId]);
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
        return DuckDBClient.runRawQuery<T>(query, { params: queryArgs });
      },

      runLocalStructuredQuery: async <T extends UnknownRow = UnknownRow>(
        params: DatasetLocalStructuredQueryOptions,
      ): Promise<QueryResult<T>> => {
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
            dataType: DuckDBDataTypeUtils.toAvaDataType(duckColumn.column_type),
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
                    ${dataType === "varchar" ? `OR "$columnName$" = ''` : ""}
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
                  ${dataType === "varchar" ? `AND "$columnName$" <> ''` : ""}
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
                 ${dataType === "varchar" ? `AND "$columnName$" <> ''` : ""}
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
              .with("varchar", () => {
                return {
                  type: "text" as const,
                };
              })
              .with("bigint", "double", async () => {
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
              .with("date", "time", "timestamp", async () => {
                const singleQuery =
                  dataType === "time" ?
                    `SELECT
                           COALESCE(CAST(MAX("$columnName$") AS VARCHAR), '') AS most_recent,
                           COALESCE(CAST(MIN("$columnName$") AS VARCHAR), '') AS oldest,
                           NULL AS days
                         FROM "$tableName$"
                         WHERE "$columnName$" IS NOT NULL`
                  : `SELECT
                           COALESCE(CAST(MAX("$columnName$") AS VARCHAR), '') AS most_recent,
                           COALESCE(CAST(MIN("$columnName$") AS VARCHAR), '') AS oldest,
                           CASE
                             WHEN MIN("$columnName$") IS NULL OR MAX("$columnName$") IS NULL THEN 0
                             ELSE DATE_DIFF('day',
                               CAST(MIN("$columnName$") AS DATE),
                               CAST(MAX("$columnName$") AS DATE)
                             ) + 1
                           END AS days
                         FROM "$tableName$"
                         WHERE "$columnName$" IS NOT NULL`;

                const row = singleton(
                  await DuckDBClient.runRawQuery<{
                    most_recent: string | null;
                    oldest: string | null;
                    days: bigint | number | null;
                  }>(singleQuery, {
                    params: { columnName, tableName: datasetId },
                  }),
                ) ?? { most_recent: "", oldest: "", days: 0 };

                const mostRecentDate = String(row.most_recent ?? "");
                const oldestDate = String(row.oldest ?? "");
                const datasetCoverage =
                  row.days === null ? "Unknown"
                  : Number(row.days) === 1 ? "1 day"
                  : `${Number(row.days)} days`;

                return {
                  type: "date" as const,
                  mostRecentDate,
                  oldestDate,
                  datasetCoverage,
                };
              })
              .with("boolean", () => {
                notifyDevAlert("Boolean field summary not implemented");
                throw new Error(`Unsupported data type: ${dataType}`);
              })
              .exhaustive(() => {
                notifyDevAlert(`Unsupported data type: ${dataType}`);
                throw new Error(`Unsupported data type: ${dataType}`);
              });

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
      { ...baseClient, ...queries, ...mutations },
      {
        queryFns: objectKeys(queries),
        mutationFns: objectKeys(mutations),
      },
    );
  });
}

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
 */
export const RawDataClient = createRawDataClient();
