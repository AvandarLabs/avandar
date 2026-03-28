import { createModule, Module } from "@modules/createModule";
import { LocalPublicDatasetClient } from "@/clients/datasets/LocalPublicDatasetClient";
import { IQETLClient, QETLClientFactory } from "@/clients/qetl/QETLClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import type { UnknownRow } from "@/clients/DuckDBClient";
import type { EmptyObject } from "@utils/types/common.types";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";

export type IPublicQETLClient = Module<
  "PublicQETLClient",
  EmptyObject,
  {
    runQuery: <RowObject extends UnknownRow = UnknownRow>(params: {
      rawSQL: string;
      dashboardId: DashboardId;
    }) => Promise<QueryResult<RowObject>>;
  }
>;

export const PublicQETLClient = createModule("PublicQETLClient", {
  builder: () => {
    const clientCache: Record<DashboardId, IQETLClient> = {};
    const _getClient = async ({
      dashboardId,
    }: {
      dashboardId: DashboardId;
    }) => {
      const cacheKey = dashboardId;
      if (clientCache[cacheKey]) {
        return clientCache[cacheKey];
      }

      const qetlClient = QETLClientFactory.create({
        getDiceFromSQL: async (rawSQL: string) => {
          const publishedDatasetIds =
            await PublicDatasetParquetStorageClient.listDatasetIdsForDashboard({
              dashboardId,
            });

          return publishedDatasetIds.filter((datasetId) => {
            return rawSQL.includes(datasetId);
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
        rawSQL,
        dashboardId,
      }: {
        rawSQL: string;
        dashboardId: DashboardId;
      }): Promise<QueryResult<RowObject>> => {
        const client = await _getClient({ dashboardId });
        const queryResults = await client.runQuery<RowObject>({ rawSQL });
        return queryResults;
      },
    };
  },
}) satisfies IPublicQETLClient;
