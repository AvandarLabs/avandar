import { createModule, Module } from "@avandar/modules";
import { LocalPublicDatasetClient } from "@/clients/datasets/LocalPublicDatasetClient";
import { IQetlClient, QetlClientFactory } from "@/clients/qetl/QetlClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { EmptyObject } from "@avandar/utils";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";

export type IPublicQetlClient = Module<
  "PublicQetlClient",
  EmptyObject,
  {
    runQuery: <RowObject extends UnknownRow = UnknownRow>(params: {
      rawSql: string;
      dashboardId: DashboardId;
    }) => Promise<QueryResult<RowObject>>;
  }
>;

export const PublicQetlClient = createModule("PublicQetlClient", {
  builder() {
    const clientCache: Record<DashboardId, IQetlClient> = {};
    const _getClient = async ({
      dashboardId,
    }: {
      dashboardId: DashboardId;
    }) => {
      const cacheKey = dashboardId;
      if (clientCache[cacheKey]) {
        return clientCache[cacheKey];
      }

      const qetlClient = QetlClientFactory.create({
        getDiceFromSql: async (rawSql: string) => {
          const publishedDatasetIds =
            await PublicDatasetParquetStorageClient.listDatasetIdsForDashboard({
              dashboardId,
            });

          return publishedDatasetIds.filter((datasetId) => {
            return rawSql.includes(datasetId);
          });
        },
        insertToStorageCache: async ({
          facts,
        }: {
          facts: Array<{ datasetId: DatasetId; parquetBlob: Blob }>;
        }) => {
          const downloadedAt = new Date().toISOString();

          await LocalPublicDatasetClient.bulkInsert({
            upsert: true,
            onConflict: {
              columnNames: ["datasetId"],
              ignoreDuplicates: false,
            },
            data: facts.map(({ datasetId, parquetBlob }) => {
              return {
                dashboardId,
                datasetId,
                parquetData: parquetBlob,
                downloadedAt,
              };
            }),
          });
        },
      });

      clientCache[cacheKey] = qetlClient;
      return qetlClient;
    };

    return {
      runQuery: async <RowObject extends UnknownRow = UnknownRow>({
        rawSql,
        dashboardId,
      }: {
        rawSql: string;
        dashboardId: DashboardId;
      }): Promise<QueryResult<RowObject>> => {
        const client = await _getClient({ dashboardId });
        const queryResults = await client.runQuery<RowObject>({ rawSql });
        return queryResults;
      },
    };
  },
}) satisfies IPublicQetlClient;
