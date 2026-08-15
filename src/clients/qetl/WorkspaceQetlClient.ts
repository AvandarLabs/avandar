import { createModule } from "@avandar/modules";
import { prop, where } from "@avandar/utils";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { QetlClientFactory } from "@/clients/qetl/QetlClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { IQetlClient } from "@/clients/qetl/QetlClient";
import type { Module } from "@avandar/modules";
import type { EmptyObject } from "@avandar/utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

export type IWorkspaceQetlClient = Module<
  "WorkspaceQetlClient",
  EmptyObject,
  {
    runQuery: {
      <RowObject extends UnknownRow = UnknownRow>(
        params: Readonly<{
          rawSql: string;
          workspaceId: Workspace.Id;
          returnType?: "js";
        }>,
      ): Promise<QueryResult.T<RowObject>>;
      (
        params: Readonly<{
          rawSql: string;
          workspaceId: Workspace.Id;
          returnType: "parquet";
        }>,
      ): Promise<Blob>;
    };
  }
>;

type WorkspaceQetlClientOptions = {
  userId: UserId;
  workspaceId: Workspace.Id;
};

async function _getAllWorkspaceDatasetIds(
  workspaceId: Workspace.Id,
): Promise<Dataset.Id[]> {
  return (
    await DatasetClient.withCache(AvaQueryClient)
      .withEnsureQueryData()
      .getAll(where("workspace_id", "eq", workspaceId))
  ).map(prop("id"));
}

async function _insertWorkspaceFacts(
  options: Readonly<{
    facts: ReadonlyArray<{ datasetId: Dataset.Id; parquetBlob: Blob }>;
    userId: UserId;
    workspaceId: Workspace.Id;
  }>,
): Promise<void> {
  await LocalDatasetClient.bulkInsert({
    upsert: true,
    onConflict: { columnNames: ["datasetId"], ignoreDuplicates: false },
    data: options.facts.map(({ datasetId, parquetBlob }) => {
      return {
        datasetId,
        parquetData: parquetBlob,
        workspaceId: options.workspaceId,
        userId: options.userId,
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
}

async function _prepareWorkspaceDatasets(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    datasetDuckDbLease: Parameters<
      typeof DuckDbClient.dropTableViewAndFile
    >[0]["datasetDuckDbLease"];
  }>,
): Promise<void> {
  const publicOwnedDatasetIds = options.datasetIds.filter(
    DatasetDuckDbCoordinator.hasPublicSnapshotDatasetOwner,
  );
  await Promise.all(
    publicOwnedDatasetIds.map(async (datasetId) => {
      await DuckDbClient.dropTableViewAndFile({
        tableOrViewName: datasetId,
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
    }),
  );
}

function _createWorkspaceQetlClient(
  options: Readonly<WorkspaceQetlClientOptions>,
): IQetlClient {
  const getAllDatasetIds = async (): Promise<Dataset.Id[]> => {
    return await _getAllWorkspaceDatasetIds(options.workspaceId);
  };
  return QetlClientFactory.create({
    getDiceFromSql: async (rawSql) => {
      const referencedIds = new Set(
        DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(rawSql),
      );
      return (await getAllDatasetIds()).filter((datasetId) => {
        return referencedIds.has(datasetId);
      });
    },
    getDuckDbLeaseDatasetIds: getAllDatasetIds,
    insertToStorageCache: async (facts) => {
      await _insertWorkspaceFacts({ ...options, facts });
    },
    prepareDuckDbDatasets: _prepareWorkspaceDatasets,
  });
}

function _createGetWorkspaceQetlClient(): (
  options: Readonly<WorkspaceQetlClientOptions>,
) => Promise<IQetlClient> {
  const clientCache: Record<`${Workspace.Id}_${UserId}`, IQetlClient> = {};
  return async (
    options: Readonly<WorkspaceQetlClientOptions>,
  ): Promise<IQetlClient> => {
    const cacheKey = `${options.workspaceId}_${options.userId}` as const;
    const cachedClient = clientCache[cacheKey];
    if (cachedClient) {
      return cachedClient;
    }
    const client = _createWorkspaceQetlClient(options);
    clientCache[cacheKey] = client;
    return client;
  };
}

/** Runs QETL queries against datasets belonging to the active workspace. */
export const WorkspaceQetlClient = createModule("WorkspaceQetlClient", {
  builder: () => {
    const getClient = _createGetWorkspaceQetlClient();

    return {
      runQuery: async <RowObject extends UnknownRow = UnknownRow>({
        rawSql,
        workspaceId,
        returnType = "js",
      }: Readonly<{
        rawSql: string;
        workspaceId: Workspace.Id;
        returnType?: "js" | "parquet";
      }>): Promise<QueryResult.T<RowObject> | Blob> => {
        const session = await AuthClient.getCurrentSession();
        if (!session?.user) {
          throw new Error(
            "Cannot run query because user is not authenticated.",
          );
        }

        const client = await getClient({
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
}) as IWorkspaceQetlClient;
