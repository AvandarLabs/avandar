import { createModule, Module } from "@modules";
import { EmptyObject, prop, where } from "@utils";
import { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import { IQETLClient, QETLClientFactory } from "@/clients/qetl/QETLClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

export type IWorkspaceQETLClient = Module<
  "WorkspaceQETLClient",
  EmptyObject,
  {
    runQuery: {
      <RowObject extends UnknownRow = UnknownRow>(params: {
        rawSql: string;
        workspaceId: Workspace.Id;
        returnType?: "js";
      }): Promise<QueryResult<RowObject>>;
      (params: {
        rawSql: string;
        workspaceId: Workspace.Id;
        returnType: "parquet";
      }): Promise<Blob>;
    };
  }
>;

export const WorkspaceQETLClient = createModule("WorkspaceQETLClient", {
  builder() {
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
        getDiceFromSql: async (rawSql: string) => {
          /**
           * Reuse the same TanStack Query cache as `DatasetClient.useGetAll`
           * (via `withEnsureQueryData`), so each QETL `runQuery` does not
           * refetch the workspace dataset list from Supabase. Staleness matches
           * other `getAll` queries: invalidate `DatasetClient.QueryKeys.getAll`
           * (or rely on default `staleTime` on `AvaQueryClient`).
           */
          const allWorkspaceDatasetIds = (
            await DatasetClient.withCache(AvaQueryClient)
              .withEnsureQueryData()
              .getAll(where("workspace_id", "eq", workspaceId))
          ).map(prop("id"));
          return allWorkspaceDatasetIds.filter((datasetId) => {
            return rawSql.includes(datasetId);
          });
        },
        insertToStorageCache: async ({
          facts,
        }: {
          facts: Array<{ datasetId: DatasetId; parquetBlob: Blob }>;
        }) => {
          await LocalDatasetClient.bulkInsert({
            upsert: true,
            onConflict: {
              columnNames: ["datasetId"],
              ignoreDuplicates: false,
            },
            data: facts.map(({ datasetId, parquetBlob }) => {
              return {
                datasetId,
                parquetData: parquetBlob,
                workspaceId,
                userId,
                parseStatus: "ready" as const,
                parseStartedAt: undefined,
                parseFailedReason: undefined,
                sourceBytes: undefined,
                sourceFileName: undefined,
                sourceFileType: undefined,
                sourceFileSize: undefined,
                lastSourceAccessedAt: undefined,
                parseOptions: undefined,
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
        workspaceId,
        returnType = "js",
      }: {
        rawSql: string;
        workspaceId: Workspace.Id;
        returnType?: "js" | "parquet";
      }): Promise<QueryResult<RowObject> | Blob> => {
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

        if (returnType === "parquet") {
          return await client.runQuery({ rawSql, returnType: "parquet" });
        }

        return await client.runQuery<RowObject>({ rawSql, returnType: "js" });
      },
    };
  },
}) as IWorkspaceQETLClient;
