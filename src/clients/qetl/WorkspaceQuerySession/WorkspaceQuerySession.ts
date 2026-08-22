import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { IQueryMediator } from "@/clients/qetl/QueryMediator/QueryMediator";
import type { NeededColumnsByDatasetId } from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { Module } from "@avandar/modules";
import type { EmptyObject } from "@avandar/utils";

import { createModule } from "@avandar/modules";
import { prop, where } from "@avandar/utils";

import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { assertWorkspaceMembership } from "@/clients/qetl/assertWorkspaceMembership/assertWorkspaceMembership";
import { assertWorkspaceRelations } from "@/clients/qetl/assertWorkspaceRelations/assertWorkspaceRelations";
import { getConceptRelationPlansFromSql } from "@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql";
import { QueryMediatorFactory } from "@/clients/qetl/QueryMediator/QueryMediator";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

export type IWorkspaceQetlClient = Module<
  "WorkspaceQuerySession",
  EmptyObject,
  {
    runQuery: {
      <RowObject extends UnknownRow = UnknownRow>(
        params: Readonly<{
          rawSql: string;
          workspaceId: Workspace.Id;
          returnType?: "js";
          signal?: AbortSignal;
          neededColumnsByDatasetId?: NeededColumnsByDatasetId;
        }>,
      ): Promise<QueryResult.T<RowObject>>;
      (
        params: Readonly<{
          rawSql: string;
          workspaceId: Workspace.Id;
          returnType: "parquet";
          signal?: AbortSignal;
          neededColumnsByDatasetId?: NeededColumnsByDatasetId;
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

/**
 * Every concept id the workspace owns.
 *
 * This is the other half of the relation allowlist, and spec 3 calls it the
 * highest-risk line in the spec: a concept relation is named
 * `concept_<uuid>` in SQL, and without an intersection against this list a
 * `concept_<uuid>` belonging to another workspace would be planned and loaded
 * from a session that has no business reading it. The dataset half of the gate
 * has always existed; adding concepts to the loading path without adding them
 * here would open exactly the hole the dataset half closes.
 *
 * Read through the shared query cache for the same reason the dataset list is:
 * it is consulted once per query that names a concept, and a concept-free query
 * never reaches it at all.
 */
async function _getAllWorkspaceConceptIds(
  workspaceId: Workspace.Id,
): Promise<Concept.Id[]> {
  return (
    await ConceptClient.withCache(AvaQueryClient)
      .withEnsureQueryData()
      .getAll(where("workspace_id", "eq", workspaceId))
  ).map(prop("id"));
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
): IQueryMediator {
  const getAllDatasetIds = async (): Promise<Dataset.Id[]> => {
    return await _getAllWorkspaceDatasetIds(options.workspaceId);
  };
  return QueryMediatorFactory.create({
    // The per-relation half of authorization. Membership is checked once per
    // `runQuery` above; this checks what the statement actually named, and
    // refuses rather than silently dropping a reference the workspace does not
    // own.
    getQueryDependencies: async (rawSql) => {
      return await assertWorkspaceRelations({
        workspaceId: options.workspaceId,
        referencedDatasetIds:
          DuckDbSqlAnalyzer.getReadDatasetIdsFromSql(rawSql),
      });
    },
    planConceptRelations: async (rawSql) => {
      return await getConceptRelationPlansFromSql({
        rawSql,
        allowlist: {
          getAllowedConceptIds: async () => {
            return await _getAllWorkspaceConceptIds(options.workspaceId);
          },
          getAllowedDatasetIds: getAllDatasetIds,
        },
      });
    },
    getDuckDbLeaseDatasetIds: getAllDatasetIds,
    // The workspace tier, scoped to this workspace and this user. A public
    // session holds `LocalPublicDatasetRelationCache` instead, so neither can
    // reach the other's entries by construction rather than by a predicate.
    relationCache: DexieRelationCache,
    principalKey: makePrincipalKeyFromWorkspaceSession({
      workspaceId: options.workspaceId,
      userId: options.userId,
    }),
    prepareDuckDbDatasets: _prepareWorkspaceDatasets,
  });
}

function _createGetWorkspaceQetlClient(): (
  options: Readonly<WorkspaceQetlClientOptions>,
) => Promise<IQueryMediator> {
  const clientCache: Record<`${Workspace.Id}_${UserId}`, IQueryMediator> = {};
  return async (
    options: Readonly<WorkspaceQetlClientOptions>,
  ): Promise<IQueryMediator> => {
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
export const WorkspaceQuerySession = createModule("WorkspaceQuerySession", {
  builder: () => {
    const getClient = _createGetWorkspaceQetlClient();

    return {
      runQuery: async <RowObject extends UnknownRow = UnknownRow>({
        rawSql,
        workspaceId,
        returnType = "js",
        signal,
        neededColumnsByDatasetId,
      }: Readonly<{
        rawSql: string;
        workspaceId: Workspace.Id;
        returnType?: "js" | "parquet";
        signal?: AbortSignal;
        neededColumnsByDatasetId?: NeededColumnsByDatasetId;
      }>): Promise<QueryResult.T<RowObject> | Blob> => {
        // The assertion owns the session read and hands back the principal it
        // verified, so a query costs one session read rather than two. That
        // read is a keychain IPC round trip on desktop, and column summaries
        // issue several queries per column.
        const userId = await assertWorkspaceMembership({ workspaceId });

        const client = await getClient({ workspaceId, userId });

        if (returnType === "parquet") {
          return await client.runQuery({
            rawSql,
            returnType: "parquet",
            signal,
            neededColumnsByDatasetId,
          });
        }

        return await client.runQuery<RowObject>({
          rawSql,
          returnType: "js",
          signal,
          neededColumnsByDatasetId,
        });
      },
    };
  },
}) as IWorkspaceQetlClient;
