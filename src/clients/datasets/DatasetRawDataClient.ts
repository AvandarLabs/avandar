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
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseMap } from "@/lib/utils/promises";
import { DatasetId } from "@/models/datasets/Dataset";
import {
  ColumnSummary,
  DatasetSummary,
} from "@/models/datasets/DatasetRawData/getSummary";
import { DuckDBClient } from "../DuckDBClient";
import { DuckDBDataType } from "../DuckDBClient/DuckDBDataType";
import { scalar, singleton } from "../DuckDBClient/queryResultHelpers";
import { LocalDatasetEntryClient } from "./LocalDatasetEntryClient";

type DatasetRawDataClientQueries = {
  getSummary(params: { datasetId: DatasetId }): Promise<DatasetSummary>;

  /**
   * Gets a preview of the dataset's locally loaded raw data.
   * If the dataset has not been loaded locally already (i.e. if it does not
   * have an entry in LocalDatasetEntryClient that maps to a local DuckDB
   * table), then this will throw an error.
   */
  getPreviewData(params: {
    datasetId: DatasetId;
    numRows: number;
  }): Promise<UnknownDataFrame>;
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
  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries = {
      async getPreviewData(params: { datasetId: DatasetId; numRows: number }) {
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

      async getSummary(params: {
        datasetId: DatasetId;
      }): Promise<DatasetSummary> {
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
      {
        ...baseClient,
        ...queries,
      },
      {
        // only turn the augmented client functions into hooks, not
        // the base client functions
        queryFns: objectKeys(queries),
        mutationFns: [],
      },
    );
  });
}

export const DatasetRawDataClient = createDatasetRawDataClient();
