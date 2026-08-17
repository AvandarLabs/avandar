import { createModule } from "@avandar/modules";
import { LocalPublicDatasetClient } from "@/clients/datasets/LocalPublicDatasetClient/LocalPublicDatasetClient";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { QetlClientFactory } from "@/clients/qetl/QetlClient/QetlClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { IQetlClient } from "@/clients/qetl/QetlClient/QetlClient";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { Module } from "@avandar/modules";
import type { EmptyObject } from "@avandar/utils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

type PublicQetlQueryParams = {
  rawSql: string;
  dashboardId: Dashboard.Id;
  visibility: PublishedVisibility;
  snapshotRevision: string;
};

type CachedClient = {
  client: IQetlClient;
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

async function _insertFactsIntoCache(
  options: Readonly<
    Pick<
      CreateQetlClientOptions,
      "bucket" | "dashboardId" | "snapshotRevision"
    > & {
      facts: ReadonlyArray<{ datasetId: Dataset.Id; parquetBlob: Blob }>;
    }
  >,
): Promise<void> {
  const { bucket, dashboardId, facts, snapshotRevision } = options;
  const downloadedAt = new Date().toISOString();
  await LocalPublicDatasetClient.bulkInsert({
    upsert: true,
    onConflict: {
      columnNames: ["dashboardId", "datasetId"],
      ignoreDuplicates: false,
    },
    data: facts.map(({ datasetId, parquetBlob }) => {
      return {
        bucket,
        dashboardId,
        datasetId,
        parquetData: parquetBlob,
        snapshotRevision,
        downloadedAt,
      };
    }),
  });
}

function _createQetlClient(
  options: Readonly<CreateQetlClientOptions>,
): IQetlClient {
  const { bucket, dashboardId, publishedDatasetIds, snapshotRevision } =
    options;
  const owner = { bucket, dashboardId, snapshotRevision } as const;
  return QetlClientFactory.create({
    duckDbReadMode: "public",
    publicSnapshotDuckDbOwner: owner,
    getDiceFromSql: async (rawSql) => {
      return _getReferencedPublishedDatasetIds({ publishedDatasetIds, rawSql });
    },
    getDuckDbLeaseDatasetIds: async () => {
      return [...publishedDatasetIds];
    },
    insertToStorageCache: async (facts) => {
      await _insertFactsIntoCache({
        bucket,
        dashboardId,
        facts,
        snapshotRevision,
      });
    },
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
  "PublicQetlClient",
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
 */
export const PublicQetlClient = createModule("PublicQetlClient", {
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
