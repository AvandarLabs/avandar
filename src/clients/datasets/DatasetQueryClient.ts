import { createServiceClient } from "@clients/ServiceClient/createServiceClient";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
import { withLogger } from "@logger/module-augmenters/withLogger";
import { notifyDevAlert } from "@ui/index";
import { where } from "@utils/index";
import { objectKeys } from "@utils/objects/objectKeys";
import { sqlTemplate } from "@utils/strings/template/sqlTemplate";
import { match } from "ts-pattern";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { scalar, singleton } from "@/clients/DuckDBClient/queryResultHelpers";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { promiseReduce } from "@/lib/utils/promises";
import type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types";
import type { WithQueryHooks } from "@hooks/withQueryHooks/withQueryHooks.types";
import type { WithLogger } from "@logger/Logger.types";
import type { UnknownDataFrame } from "@utils/types/common.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

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

type DatasetQueryClientQueries = {
  getPreviewData: (params: {
    datasetId: DatasetId;
    numRows: number;
    workspaceId: Workspace.Id;
  }) => Promise<UnknownDataFrame>;

  getSummary: (params: {
    datasetId: DatasetId;
    workspaceId: Workspace.Id;
  }) => Promise<DatasetSummary>;
};

type IDatasetQueryClient = ServiceClient & DatasetQueryClientQueries;

function createDatasetQueryClient(): WithLogger<
  WithQueryHooks<IDatasetQueryClient, keyof DatasetQueryClientQueries, never>
> {
  const baseClient = createServiceClient("DatasetQueryClient");

  return withLogger(baseClient, (clientLogger) => {
    const queries: DatasetQueryClientQueries = {
      getPreviewData: async (params) => {
        const logger = clientLogger.appendName("getPreviewData");
        logger.log("Getting preview data for dataset", params);
        const { datasetId, numRows, workspaceId } = params;

        const queryString = sqlTemplate(
          'SELECT * FROM "$tableName$" LIMIT $numRows$',
        ).parse({ numRows, tableName: datasetId });

        const { data } = await WorkspaceQETLClient.runQuery({
          rawSQL: queryString,
          workspaceId,
        });
        return data;
      },
      getSummary: async (params: {
        datasetId: DatasetId;
        workspaceId: Workspace.Id;
      }): Promise<DatasetSummary> => {
        const logger = clientLogger.appendName("getSummary");
        logger.log("Calling `getSummary`", params);
        const { datasetId, workspaceId } = params;
        const columns = (
          await DatasetColumnClient.getAll(where("dataset_id", "eq", datasetId))
        ).map((col) => {
          return {
            name: col.name,
            dataType: col.dataType,
            columnIdx: col.columnIdx,
          };
        });

        const numRows = Number(
          scalar(
            await WorkspaceQETLClient.runQuery<{
              count: bigint;
            }>({
              workspaceId,
              rawSQL: sqlTemplate(
                'SELECT COUNT(*) as count FROM "$tableName$"',
              ).parse({ tableName: datasetId }),
            }),
          ),
        );

        const columnSummaries: ColumnSummary[] = await promiseReduce(
          columns,
          async (summaries, column): Promise<ColumnSummary[]> => {
            const { name: columnName, dataType } = column;

            const distinctValuesCount = Number(
              scalar(
                await WorkspaceQETLClient.runQuery<{
                  count: bigint;
                }>({
                  workspaceId,
                  rawSQL: sqlTemplate(
                    'SELECT COUNT(DISTINCT "$columnName$") as count FROM "$tableName$"',
                  ).parse({
                    columnName: columnName,
                    tableName: datasetId,
                  }),
                }),
              ),
            );

            const emptyValuesCount = Number(
              scalar(
                await WorkspaceQETLClient.runQuery<{
                  count: bigint;
                }>({
                  workspaceId,
                  rawSQL: sqlTemplate(
                    `SELECT COUNT("$columnName$") as count
                    FROM "$tableName$"
                    WHERE "$columnName$" IS NULL
                    ${dataType === "varchar" ? `OR "$columnName$" = ''` : ""}
                  `,
                  ).parse({ columnName, tableName: datasetId }),
                }),
              ),
            );

            // Find the maximum count for the most common value(s)
            const maxCountResult = await WorkspaceQETLClient.runQuery<{
              max_count: bigint;
            }>({
              workspaceId,
              rawSQL: sqlTemplate(
                `SELECT MAX(cnt) as max_count FROM (
                SELECT COUNT(*) as cnt
                FROM "$tableName$"
                WHERE
                  "$columnName$" IS NOT NULL
                  ${dataType === "varchar" ? `AND "$columnName$" <> ''` : ""}
                GROUP BY "${columnName}"
              )`,
              ).parse({ columnName, tableName: datasetId }),
            });
            const maxCount = maxCountResult.data[0]?.max_count ?? 0n;

            // Get all values with the maximum count
            const mostCommonValuesQuery = await WorkspaceQETLClient.runQuery<{
              value: unknown;
              count: bigint;
            }>({
              workspaceId,
              rawSQL: sqlTemplate(
                `SELECT "$columnName$" AS value, COUNT(*) AS count
               FROM "$tableName$"
               WHERE
                 "$columnName$" IS NOT NULL
                 ${dataType === "varchar" ? `AND "$columnName$" <> ''` : ""}
               GROUP BY "$columnName$"
               HAVING COUNT(*) = $maxCount$
               ORDER BY value
               LIMIT 10`, // only get the top 10 to save memory
              ).parse({
                columnName,
                tableName: datasetId,
                maxCount,
              }),
            });
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
                  await WorkspaceQETLClient.runQuery<{
                    max: number;
                    min: number;
                    avg: number;
                    stdDev: number;
                  }>({
                    workspaceId,
                    rawSQL: sqlTemplate(
                      `SELECT
                        MAX("$columnName$") as max,
                        MIN("$columnName$") as min,
                        AVG("$columnName$") as avg,
                        STDDEV_SAMP("$columnName$") as stdDev
                      FROM "$tableName$"`,
                    ).parse({ columnName, tableName: datasetId }),
                  }),
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
                  await WorkspaceQETLClient.runQuery<{
                    most_recent: string | null;
                    oldest: string | null;
                    days: bigint | number | null;
                  }>({
                    workspaceId,
                    rawSQL: sqlTemplate(singleQuery).parse({
                      columnName,
                      tableName: datasetId,
                    }),
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
      { ...baseClient, ...queries },
      {
        queryFns: objectKeys(queries),
      },
    );
  });
}

/**
 * Creates a client to run predefinedqueries on a dataset.
 *
 * If you want to run a custom raw query, then just call
 * WorkspaceQETLClient.runQuery() directly.
 */
export const DatasetQueryClient = createDatasetQueryClient();
