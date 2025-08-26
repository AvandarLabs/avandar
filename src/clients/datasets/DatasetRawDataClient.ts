import { invariant } from "@tanstack/react-router";
import { match } from "ts-pattern";
import { AvaDexie } from "@/dexie/AvaDexie";
import { createDexieCRUDClient } from "@/lib/clients/dexie/createDexieCRUDClient";
import { UnknownDataFrame, UnknownObject } from "@/lib/types/common";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseMap } from "@/lib/utils/promises";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetRawDataParsers } from "@/models/datasets/DatasetRawData";
import {
  ColumnSummary,
  DatasetSummary,
} from "@/models/datasets/DatasetRawData/getSummary";
import { DuckDBClient } from "../DuckDBClient";
import { DuckDBDataType } from "../DuckDBClient/DuckDBDataType";
import { QueryResultData } from "../DuckDBClient/types";

function scalar<V, T extends { [key: string]: V }>(
  query: QueryResultData<T>,
): V {
  invariant(query.data.length !== 0, "No data found");
  invariant(
    query.data.length === 1,
    "Multiple rows found. A scalar requires a single row.",
  );
  const firstRow = query.data[0]!;
  const keys = objectKeys(firstRow);
  invariant(
    keys.length !== 0,
    "Received an empty row. A scalar requires a value.",
  );
  invariant(
    keys.length === 1,
    "Multiple columns found. A scalar requires a single column.",
  );
  return firstRow[keys[0]!]!;
}

function singleton<T extends UnknownObject>(
  query: QueryResultData<T>,
): T | undefined {
  if (query.data.length === 0) {
    return undefined;
  }
  invariant(
    query.data.length === 1,
    "Multiple rows found. A singleton requires a single row.",
  );
  return query.data[0]!;
}

// TODO(jpsyx): we need to create a DuckDBCrudClient. We aren't using
// IndexedDB at all for this actually. Also this should get renamed to
// DatasetLocalCopyClient with a DatasetLocalCopy model.
export const DatasetRawDataClient = createDexieCRUDClient({
  db: AvaDexie.DB,
  modelName: "DatasetRawData",
  parsers: DatasetRawDataParsers,
  queries: ({ logger: clientLogger }) => {
    return {
      getSummary: async (params: {
        datasetId: DatasetId;
      }): Promise<DatasetSummary> => {
        const logger = clientLogger.appendName("getSummary");
        const { datasetId } = params;
        logger.log("Getting summary for dataset", params);

        const duckdbColumns = await DuckDBClient.getCSVSchema(datasetId);
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
              datasetName: datasetId,
            }),
          ),
        );

        const columnSummaries = await promiseMap(
          columns,
          async (column): Promise<ColumnSummary> => {
            const { name: colName, dataType } = column;

            const distinctValuesCount = Number(
              scalar(
                await DuckDBClient.runRawQuery<{
                  count: bigint;
                }>(
                  `SELECT COUNT(DISTINCT "${colName}") as count FROM "$tableName$"`,
                  { datasetName: datasetId },
                ),
              ),
            );

            const emptyValuesCount = Number(
              scalar(
                await DuckDBClient.runRawQuery<{
                  count: bigint;
                }>(
                  `SELECT COUNT("${colName}") as count FROM "$tableName$"
                WHERE "${colName}" IS NULL
                ${dataType === "text" ? `OR "${colName}" = ''` : ""}`,
                  { datasetName: datasetId },
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
                    "${colName}" IS NOT NULL
                    ${dataType === "text" ? `AND "${colName}" <> ''` : ""}
                  GROUP BY "${colName}"
                )`,
              { datasetName: datasetId },
            );
            const maxCount = maxCountResult.data[0]?.max_count ?? 0n;

            // Get all values with the maximum count
            const mostCommonValuesQuery = await DuckDBClient.runRawQuery<{
              value: unknown;
              count: bigint;
            }>(
              `SELECT "${colName}" AS value, COUNT(*) AS count
               FROM "$tableName$"
               WHERE
                 "${colName}" IS NOT NULL
                 ${dataType === "text" ? `AND "${colName}" <> ''` : ""}
               GROUP BY "${colName}"
               HAVING COUNT(*) = ${maxCount}
               ORDER BY value
               LIMIT 10`, // only get the top 10 to save memory
              { datasetName: datasetId },
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
                        MAX("${colName}") as max,
                        MIN("${colName}") as min,
                        AVG("${colName}") as avg,
                        STDDEV_SAMP("${colName}") as stdDev
                      FROM "$tableName$"`,
                    { datasetName: datasetId },
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
              name: colName,
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

      getPreviewData: async (params: {
        datasetId: DatasetId;
        numRows: number;
      }): Promise<UnknownDataFrame> => {
        const logger = clientLogger.appendName("getPreviewData");
        logger.log("Getting preview data for dataset", params);
        const { datasetId, numRows } = params;
        const result = await DuckDBClient.runRawQuery(
          `SELECT * FROM "$tableName$" LIMIT ${numRows}`,
          { datasetName: datasetId },
        );
        return result.data;
      },
    };
  },
});
