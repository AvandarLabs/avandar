import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { IQueryMediator } from "@/clients/qetl/QueryMediator/QueryMediator";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { Module } from "@avandar/modules";
import type { EmptyObject } from "@avandar/utils";

import { createModule } from "@avandar/modules";

import { makePrincipalKeyFromPublicSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { QueryMediatorFactory } from "@/clients/qetl/QueryMediator/QueryMediator";
import { LocalPublicDatasetRelationCache } from "@/clients/qetl/RelationCache/LocalPublicDatasetRelationCache/LocalPublicDatasetRelationCache";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

type PublicQetlQueryParams = {
  rawSql: string;
  dashboardId: Dashboard.Id;
  visibility: PublishedVisibility;
  snapshotRevision: string;
};

type CachedClient = {
  client: IQueryMediator;
  publishedDatasetIds: readonly Dataset.Id[];
};

type ClientCache = Record<string, CachedClient>;

type CreateQetlClientOptions = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  publishedDatasetIds: readonly Dataset.Id[];
  snapshotRevision: string;
};

type GetClientOptions = {
  clientCache: ClientCache;
  dashboardId: Dashboard.Id;
  visibility: PublishedVisibility;
  snapshotRevision: string;
};

function _buildClientCacheKey(
  options: Readonly<{
    dashboardId: Dashboard.Id;
    visibility: PublishedVisibility;
    snapshotRevision: string;
  }>,
): string {
  const { dashboardId, visibility, snapshotRevision } = options;
  return `${dashboardId}/${visibility}/${snapshotRevision}`;
}

function _getReferencedPublishedDatasetIds(
  options: Readonly<{
    publishedDatasetIds: readonly Dataset.Id[];
    rawSql: string;
  }>,
): Dataset.Id[] {
  const referencedDatasetIds = new Set(
    DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(options.rawSql),
  );
  return options.publishedDatasetIds.filter((datasetId) => {
    return referencedDatasetIds.has(datasetId);
  });
}

function _createQetlClient(
  options: Readonly<CreateQetlClientOptions>,
): IQueryMediator {
  const { bucket, dashboardId, publishedDatasetIds, snapshotRevision } =
    options;
  const owner = { bucket, dashboardId, snapshotRevision } as const;
  return QueryMediatorFactory.create({
    duckDbReadMode: "public",
    publicSnapshotDuckDbOwner: owner,
    getQueryDependencies: async (rawSql) => {
      return _getReferencedPublishedDatasetIds({ publishedDatasetIds, rawSql });
    },
    getDuckDbLeaseDatasetIds: async () => {
      return [...publishedDatasetIds];
    },
    // The public tier, scoped to this exact published snapshot. This is what
    // closes the cross-visibility gap: the read path used to go to
    // `LocalDataset` for every session, so a public query probed the workspace
    // store while writing its own bytes somewhere that was never read back.
    // `LocalPublicDatasetRelationCache` decodes the principal and refuses a
    // workspace-form one, so it cannot serve one even by mistake.
    relationCache: LocalPublicDatasetRelationCache,
    principalKey: makePrincipalKeyFromPublicSession({
      bucket,
      dashboardId,
      snapshotRevision,
    }),
    prepareDuckDbDatasets: async ({ datasetIds }) => {
      DatasetDuckDbCoordinator.assertPublicSnapshotDatasetOwners({
        datasetIds,
        owner,
      });
    },
  });
}

async function _getClient(
  options: Readonly<GetClientOptions>,
): Promise<CachedClient> {
  const { clientCache, dashboardId, visibility, snapshotRevision } = options;
  const cacheKey = _buildClientCacheKey(options);
  const cachedClient = clientCache[cacheKey];
  if (cachedClient) {
    return cachedClient;
  }
  const bucket =
    SnapshotStorageUtils.getSnapshotBucketNameFromVisibility(visibility);
  const publishedDatasetIds =
    await PublicDatasetParquetStorageClient.listDatasetIdsForDashboard({
      bucket,
      dashboardId,
      snapshotRevision,
    });
  const createdClient = {
    client: _createQetlClient({
      bucket,
      dashboardId,
      publishedDatasetIds,
      snapshotRevision,
    }),
    publishedDatasetIds,
  };
  clientCache[cacheKey] = createdClient;
  return createdClient;
}

/** Public query client contract for committed dashboard snapshots. */
export type IPublicQetlClient = Module<
  "PublicQuerySession",
  EmptyObject,
  {
    /** Executes one SQL query against the committed snapshot revision. */
    runQuery: <RowObject extends UnknownRow = UnknownRow>(
      params: Readonly<PublicQetlQueryParams>,
    ) => Promise<QueryResult.T<RowObject>>;
  }
>;

/**
 * Executes SQL only against the immutable snapshot committed by a dashboard.
 *
 * This path deliberately has no workspace membership check, unlike
 * `WorkspaceQuerySession`. It is authorized structurally instead: the reachable
 * dataset ids are exactly the ones `PublicDatasetParquetStorageClient` lists
 * for the requested snapshot revision, `_getReferencedPublishedDatasetIds`
 * intersects the SQL's table references with that list, and
 * `assertPublicSnapshotDatasetOwners` rejects a table loaded by any other
 * snapshot. A dataset outside the snapshot therefore yields nothing, so a
 * membership check would add a second, parallel authorization mechanism
 * without narrowing what this client can read.
 */
export const PublicQuerySession = createModule("PublicQuerySession", {
  builder: () => {
    const clientCache: ClientCache = {};
    return {
      runQuery: async <RowObject extends UnknownRow = UnknownRow>(
        params: Readonly<PublicQetlQueryParams>,
      ): Promise<QueryResult.T<RowObject>> => {
        const { client } = await _getClient({ clientCache, ...params });
        return await client.runQuery<RowObject>({ rawSql: params.rawSql });
      },
    };
  },
}) satisfies IPublicQetlClient;
