import { createModule, Module } from "@modules/createModule";
import { EmptyObject, prop, where } from "@utils/index";
import { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import { AuthClient } from "@/clients/AuthClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { UnknownRow } from "@/clients/DuckDBClient/index";
import { IQETLClient, QETLClientFactory } from "@/clients/qetl/QETLClient";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

export type IWorkspaceQETLClient = Module<
  "WorkspaceQETLClient",
  EmptyObject,
  {
    runQuery: <RowObject extends UnknownRow = UnknownRow>(params: {
      rawSQL: string;
      workspaceId: Workspace.Id;
    }) => Promise<QueryResult<RowObject>>;
  }
>;

export const WorkspaceQETLClient = createModule("WorkspaceQETLClient", {
  builder: () => {
    const clientCache: Record<`${Workspace.Id}_${UserId}`, IQETLClient> = {};
    const _getClient = async ({
      workspaceId,
      userId,
    }: {
      workspaceId: Workspace.Id;
      userId: UserId;
    }) => {
      const cacheKey = `${workspaceId}_${userId}` as const;
      if (clientCache[cacheKey]) {
        return clientCache[cacheKey];
      }

      const qetlClient = QETLClientFactory.create({
        getDiceFromSQL: async (rawSQL: string) => {
          const allWorkspaceDatasetIds = (
            await DatasetClient.getAll(where("workspace_id", "eq", workspaceId))
          ).map(prop("id"));
          return allWorkspaceDatasetIds.filter((datasetId) => {
            return rawSQL.includes(datasetId);
          });
        },
        insertToStorageCache: async ({
          facts,
        }: {
          facts: Array<{ datasetId: DatasetId; parquetBlob: Blob }>;
        }) => {
          await LocalDatasetClient.bulkInsert({
            data: facts.map(({ datasetId, parquetBlob }) => {
              return {
                datasetId,
                parquetData: parquetBlob,
                workspaceId,
                userId,
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
        workspaceId,
      }: {
        rawSQL: string;
        workspaceId: Workspace.Id;
      }): Promise<QueryResult<RowObject>> => {
        const session = await AuthClient.getCurrentSession();
        if (!session?.user) {
          throw new Error(
            "Cannot run query because user is not authenticated.",
          );
        }

        const client = await _getClient({
          workspaceId,
          userId: session.user.id as UserId,
        });

        const queryResults = await client.runQuery<RowObject>({ rawSQL });
        return queryResults;
      },
    };
  },
}) satisfies IWorkspaceQETLClient;
